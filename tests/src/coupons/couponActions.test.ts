import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createCoupon } from '@/actions/couponActions';

import { isAdmin } from '@/utils/admin-only';
import { getApiAuthToken } from '@/utils/auth-utils';

vi.mock('server-only', () => { return {}; });
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));
vi.mock('@/utils/admin-only');
vi.mock('@/utils/auth-utils');

describe('createCoupon Action', () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    beforeEach(() => {
        vi.clearAllMocks();
        // Fix isAdmin mock to return object instead of boolean
        vi.mocked(isAdmin).mockResolvedValue({
            id: 'admin-123',
            email: 'admin@example.com',
            phoneNumber: '1234567890',
            firstName: 'Admin',
            lastName: 'User'
        });
        vi.mocked(getApiAuthToken).mockResolvedValue('fake-token');

        // Default successful fetch response
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ success: true }),
        });
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    const createBaseFormData = () => {
        const formData = new FormData();
        formData.append('name', 'Test Coupon');
        formData.append('code', 'TEST20');
        formData.append('discountType', 'flat');
        formData.append('flatDiscount', '20');
        formData.append('validFrom', new Date().toISOString());
        // Valid until 5 days from now
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 5);
        formData.append('validUntil', futureDate.toISOString());
        formData.append('isActive', 'true');
        formData.append('applicableDays', JSON.stringify(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']));
        return formData;
    };

    it('should return error if coupon code already exists (Unique Code Check)', async () => {
        // Mock API returning "already exists" error
        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Coupon code already exists' }),
        });

        const formData = createBaseFormData();
        formData.set('code', 'SUMMER20');

        const result = await createCoupon(formData);

        expect(result).toEqual({ error: 'This coupon code already exists' });
        expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle case insensitivity (convert code to uppercase)', async () => {
        const formData = createBaseFormData();
        formData.set('code', 'summer20');

        await createCoupon(formData);

        // Check if the body sent to fetch contains strict uppercase code
        const fetchCall = mockFetch.mock.calls[0];
        const body = JSON.parse(fetchCall[1].body);

        expect(body.code).toBe('SUMMER20');
    });

    it('should return error if validUntil is before validFrom (Date Logic)', async () => {
        const formData = createBaseFormData();
        const validFrom = new Date();
        const validUntil = new Date(validFrom.getTime() - 86400000); // 1 day before

        formData.set('validFrom', validFrom.toISOString());
        formData.set('validUntil', validUntil.toISOString());

        const result = await createCoupon(formData);

        expect(result).toEqual({ error: 'Valid until date must be after valid from date' });
        expect(mockFetch).not.toHaveBeenCalled(); // Should fail before API call
    });

    it('should return error for negative discount values (Negative Values)', async () => {
        const formData = createBaseFormData();
        formData.set('flatDiscount', '-100');

        const result = await createCoupon(formData);

        // Verification: expecting validation error for negative value
        expect(result).toEqual({ error: "Flat discount must be greater than 0" });
    });

    it('should return error if percentage discount > 100 (Percentage Cap)', async () => {
        const formData = createBaseFormData();
        formData.set('discountType', 'percentage');
        formData.set('discountPercentage', '110');

        const result = await createCoupon(formData);

        expect(result).toEqual(expect.objectContaining({ error: expect.stringMatching(/percentage.*100/i) }));
    });

    it('should return error for empty applicable days list (Zero Days)', async () => {
        const formData = createBaseFormData();
        formData.set('applicableDays', '[]');

        const result = await createCoupon(formData);

        expect(result).toEqual({ error: "Please select at least one applicable day" });
        expect(mockFetch).not.toHaveBeenCalled();
    });
});
