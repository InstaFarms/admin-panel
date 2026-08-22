import { describe, it, expect, vi, afterEach } from 'vitest';
import { calculateCouponDiscount } from '@/tests/lib/pricing';
import { Coupon } from '@/utils/types';

describe('calculateCouponDiscount', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    const baseCoupon: Coupon = {
        id: 'test-id',
        name: 'Test Coupon',
        code: 'TEST',
        isActive: true,
        minOrderValue: 0,
        maxDiscountAmount: 0,
        discountPercentage: null,
        flatDiscount: null,
        newUsersOnly: false,
        applicableDays: [],
        usedCount: 0,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: null,
        updatedBy: null,
        adminCreatedBy: null,
        adminUpdatedBy: null,
    };

    it('should apply fixed discount correctly (Fixed Discount)', () => {
        const coupon: Coupon = {
            ...baseCoupon,
            flatDiscount: 200,
        };
        const total = 1000;
        const discount = calculateCouponDiscount(coupon, total);
        expect(discount).toBe(200);
    });

    it('should cap fixed discount at total amount (Fixed > Total)', () => {
        const coupon: Coupon = {
            ...baseCoupon,
            flatDiscount: 500,
        };
        const total = 400;
        const discount = calculateCouponDiscount(coupon, total);
        expect(discount).toBe(400); // Should be capped at total
    });

    it('should apply percentage discount correctly (Percentage Standard)', () => {
        const coupon: Coupon = {
            ...baseCoupon,
            discountPercentage: '10',
        };
        const total = 1000;
        const discount = calculateCouponDiscount(coupon, total);
        expect(discount).toBe(100);
    });

    it('should cap percentage discount at max cap (Percentage Capped)', () => {
        const coupon: Coupon = {
            ...baseCoupon,
            discountPercentage: '50',
            maxDiscountAmount: 2000,
        };
        const total = 10000;
        // 50% of 10000 is 5000, cap is 2000
        const discount = calculateCouponDiscount(coupon, total);
        expect(discount).toBe(2000);
    });

    it('should check if percentage discount is within cap (Percentage Uncapped)', () => {
        const coupon: Coupon = {
            ...baseCoupon,
            discountPercentage: '50',
            maxDiscountAmount: 2000,
        };
        const total = 1000;
        // 50% of 1000 is 500, cap is 2000
        const discount = calculateCouponDiscount(coupon, total);
        expect(discount).toBe(500);
    });

    it('should return 0 if coupon is expired (Expiry Check)', () => {
        const coupon: Coupon = {
            ...baseCoupon,
            validUntil: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        };
        const discount = calculateCouponDiscount(coupon, 1000);
        expect(discount).toBe(0);
    });

    it('should return 0 if coupon is inactive (Status Check)', () => {
        const coupon: Coupon = {
            ...baseCoupon,
            isActive: false,
        };
        const discount = calculateCouponDiscount(coupon, 1000);
        expect(discount).toBe(0);
    });

    it('should return 0 if booking day is not allowed (Day Check)', () => {
        const coupon: Coupon = {
            ...baseCoupon,
            applicableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        };
        // Sunday Jan 21 2024
        const bookingDate = new Date('2024-01-21T10:00:00Z');
        const discount = calculateCouponDiscount(coupon, 1000, {
            bookingDates: [bookingDate]
        });
        expect(discount).toBe(0);
    });

    it('should return 0 if booking amount is less than min order value (Min Order Value)', () => {
        const coupon: Coupon = {
            ...baseCoupon,
            minOrderValue: 1000,
            flatDiscount: 100,
        };
        const discount = calculateCouponDiscount(coupon, 800);
        expect(discount).toBe(0);
    });

    it('should return 0 if coupon is not applicable to property (Property Match)', () => {
        const coupon: Coupon = {
            ...baseCoupon,
            entityIds: ['farm-a'],
            flatDiscount: 100,
        };
        const discount = calculateCouponDiscount(coupon, 1000, {
            propertyId: 'farm-b'
        });
        expect(discount).toBe(0);
    });

    it('should apply discount for new user with no booking history (New User Success)', () => {
        const coupon: Coupon = {
            ...baseCoupon,
            newUsersOnly: true,
            flatDiscount: 100,
        };
        const discount = calculateCouponDiscount(coupon, 1000, {
            customerBookingStatuses: []
        });
        expect(discount).toBe(100);
    });

    it('should return 0 for new user coupon if user has completed bookings (New User Fail)', () => {
        const coupon: Coupon = {
            ...baseCoupon,
            newUsersOnly: true,
            flatDiscount: 100,
        };
        const discount = calculateCouponDiscount(coupon, 1000, {
            customerBookingStatuses: ['completed']
        });
        expect(discount).toBe(0);
    });

    it('should apply discount for new user coupon if user only has cancelled bookings (New User Edge)', () => {
        const coupon: Coupon = {
            ...baseCoupon,
            newUsersOnly: true,
            flatDiscount: 100,
        };
        const discount = calculateCouponDiscount(coupon, 1000, {
            customerBookingStatuses: ['cancelled']
        });
        expect(discount).toBe(100);
    });

    it('should fail if coupon expires at 23:59:59 and used at 00:00:01 (The Midnight Bug)', () => {
        const expiryDate = '2024-01-20T23:59:59.000Z';
        const coupon: Coupon = {
            ...baseCoupon,
            validUntil: expiryDate,
        };

        // Usage at 00:00:01 the next day
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-21T00:00:01.000Z'));

        const discount = calculateCouponDiscount(coupon, 1000);
        expect(discount).toBe(0);
    });

    it('should pass if booking amount equals min order value (Exact Match)', () => {
        const coupon: Coupon = {
            ...baseCoupon,
            minOrderValue: 1000,
            flatDiscount: 100,
        };
        // Booking amount is exactly 1000. Should allow discount.
        const discount = calculateCouponDiscount(coupon, 1000);
        expect(discount).toBe(100);
    });
});
