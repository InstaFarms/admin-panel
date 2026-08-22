import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
    createProperty,
    createPropertyFromPayload,
    editProperty,
    editPropertyFromPayload,
    deleteProperty,
    getPropertyById,
    createSplitProperty,
    fetchPropertyFullData,
} from '@/actions/propertyActions';

import { apiGet, apiPost, apiPatch } from '@/utils/api-utils';

vi.mock('server-only', () => { return {}; });
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));
vi.mock('next/headers', () => ({
    cookies: vi.fn(),
}));
vi.mock('@/utils/api-utils');

describe('propertyActions', () => {
    beforeEach(async () => {
        vi.clearAllMocks();

        // Mock cookies to return token by default
        const { cookies } = await import('next/headers');
        vi.mocked(cookies).mockResolvedValue({
            get: () => ({ value: 'fake-token' }),
        } as any);

        // Mock apiGet, apiPost, and apiPatch
        vi.mocked(apiGet).mockResolvedValue({ data: {}, success: true } as any);
        vi.mocked(apiPost).mockResolvedValue({ success: true, data: { id: 'prop-123' } } as any);
        vi.mocked(apiPatch).mockResolvedValue({ success: true } as any);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    const createBaseFormData = () => {
        const formData = new FormData();
        formData.append('propertyName', 'Test Property');
        formData.append('propertyCode', 'TEST001');
        formData.append('galleries', '[]');
        formData.append('owners', '[]');
        formData.append('managers', '[]');
        formData.append('caretakers', '[]');
        formData.append('safetyHygiene', '[]');
        formData.append('discountPlans', '[]');
        formData.append('cancellationPlans', '[]');
        formData.append('amenities', '[]');
        formData.append('activities', '[]');
        formData.append('specialDates', '[]');
        formData.append('allowCallBooking', 'true');
        formData.append('allowOnlineBooking', 'true');
        formData.append('allowEnquiry', 'true');
        formData.append('commissionPercentage', '10');
        return formData;
    };

    describe('createProperty', () => {
        it('should return error if unauthorized (no token)', async () => {
            // Temporarily mock cookies to return no token
            const { cookies } = await import('next/headers');
            vi.mocked(cookies).mockResolvedValueOnce({
                get: () => undefined,
            } as any);

            const formData = createBaseFormData();
            const result = await createProperty(formData);

            expect(result).toEqual({ error: 'No authentication token found' });
            expect(apiPost).not.toHaveBeenCalled();
        });

        it('should return error if galleries data is invalid', async () => {
            const formData = createBaseFormData();
            formData.set('galleries', 'invalid json');

            const result = await createProperty(formData);

            expect(result).toEqual(expect.objectContaining({ error: expect.any(String) }));
        });

        it('should return error if amenities data is invalid', async () => {
            const formData = createBaseFormData();
            formData.set('amenities', 'invalid json');

            const result = await createProperty(formData);

            expect(result).toEqual(expect.objectContaining({ error: expect.any(String) }));
        });

        it('should create property successfully with valid data', async () => {
            const formData = createBaseFormData();
            formData.append('bedroomCount', '3');
            formData.append('bathroomCount', '2');
            formData.append('address', '123 Test St');

            const result = await createProperty(formData);

            expect(result).toEqual(expect.objectContaining({ success: expect.any(String) }));
            expect(apiPost).toHaveBeenCalledWith(
                '/api/properties',
                expect.objectContaining({
                    propertyName: 'Test Property',
                    propertyCode: 'TEST001',
                }),
                expect.objectContaining({
                    token: expect.any(String),
                })
            );
        });

        it('should handle galleries data correctly', async () => {
            const formData = createBaseFormData();
            const galleries = [
                {
                    photoUrl: 'https://example.com/photo.jpg',
                    rawUrl: 'https://example.com/raw.jpg',
                    fileName: 'photo.jpg',
                    sortOrder: 0,
                    isCover: true,
                },
            ];
            formData.set('galleries', JSON.stringify(galleries));

            const result = await createProperty(formData);

            expect(result).toEqual(expect.objectContaining({ success: expect.any(String) }));
            // Verify apiPost was called and check the gallery in the payload
            expect(apiPost).toHaveBeenCalled();
            const callArgs = vi.mocked(apiPost).mock.calls[0];
            expect(callArgs[0]).toBe('/api/properties');
            const payload = callArgs[1] as any;
            expect(payload).toHaveProperty('gallery');
            expect(Array.isArray(payload.gallery)).toBe(true);
            expect(payload.gallery.length).toBeGreaterThan(0);
            expect(payload.gallery[0]).toMatchObject({
                url: expect.any(String),
                order: 0,
                cover: 1,
            });
        });

        it('should handle amenities with weight, isPaid, and isUSP', async () => {
            const formData = createBaseFormData();
            const amenities = [
                {
                    id: 'amenity-1',
                    name: 'WiFi',
                    weight: 5,
                    isPaid: true,
                    isUSP: false,
                },
            ];
            formData.set('amenities', JSON.stringify(amenities));

            const result = await createProperty(formData);

            expect(result).toEqual(expect.objectContaining({ success: expect.any(String) }));
            expect(apiPost).toHaveBeenCalledWith(
                '/api/properties',
                expect.objectContaining({
                    amenities: expect.arrayContaining([
                        expect.objectContaining({
                            id: 'amenity-1',
                            weight: 5,
                        }),
                    ]),
                }),
                expect.any(Object)
            );
        });
    });

    describe('createPropertyFromPayload', () => {
        it('creates property and returns property id metadata', async () => {
            vi.mocked(apiPost).mockResolvedValueOnce({
                success: true,
                data: { id: 'prop-123' },
                meta: { propertyId: 'prop-123' },
            } as any);

            const result = await createPropertyFromPayload({
                propertyName: 'Draft Property',
                propertyCode: 'DRAFT-001',
                relationIntent: { amenities: 'replace' },
            });

            expect(apiPost).toHaveBeenCalledWith(
                '/api/properties',
                expect.objectContaining({
                    propertyName: 'Draft Property',
                    propertyCode: 'DRAFT-001',
                }),
                expect.any(Object)
            );
            expect(result).toEqual(
                expect.objectContaining({
                    success: expect.any(String),
                    data: {
                        propertyId: 'prop-123',
                    },
                })
            );
        });
    });

    describe('editProperty', () => {
        it('should return error if id is missing', async () => {
            const formData = createBaseFormData();
            const result = await editProperty('', formData);

            expect(result).toEqual({ error: 'Invalid id.' });
            expect(apiPatch).not.toHaveBeenCalled();
        });

        it('should return error if property update fails', async () => {
            // Mock API to return failure
            vi.mocked(apiPatch).mockResolvedValueOnce({ success: false, message: 'Property not found' } as any);

            const formData = createBaseFormData();
            const result = await editProperty('invalid-id', formData);

            expect(result).toEqual({ error: expect.stringMatching(/Failed to update property|Property not found/) });
        });

        it('should update property successfully', async () => {
            // editProperty doesn't fetch property first, it just updates
            const formData = createBaseFormData();
            formData.set('propertyName', 'Updated Property Name');

            const result = await editProperty('prop-123', formData);

            expect(result).toEqual(expect.objectContaining({ success: expect.any(String) }));
            expect(apiPatch).toHaveBeenCalledWith(
                '/api/properties/prop-123',
                expect.objectContaining({
                    propertyName: 'Updated Property Name',
                }),
                expect.any(Object)
            );
        });

        it('should handle partial updates correctly', async () => {
            // editProperty doesn't fetch property first, it just updates
            const formData = createBaseFormData();
            formData.set('bedroomCount', '4');

            const result = await editProperty('prop-123', formData);

            expect(result).toEqual(expect.objectContaining({ success: expect.any(String) }));
            expect(apiPatch).toHaveBeenCalledWith(
                '/api/properties/prop-123',
                expect.objectContaining({
                    bedroomCount: 4,
                }),
                expect.any(Object)
            );
        });
    });

    describe('deleteProperty', () => {
        it('should return error if id is missing', async () => {
            const result = await deleteProperty('');

            expect(result).toEqual({ error: 'Invalid id.' });
            expect(apiPatch).not.toHaveBeenCalled();
        });

        it('should soft delete property even if not found (API handles it)', async () => {
            // deleteProperty doesn't check existence first, it just disables
            const result = await deleteProperty('invalid-id');

            expect(result).toEqual(expect.objectContaining({ success: expect.any(String) }));
            expect(apiPatch).toHaveBeenCalled();
        });

        it('should soft delete property successfully', async () => {
            const existingProperty = { id: 'prop-123', propertyName: 'Test Property' };
            vi.mocked(apiGet).mockResolvedValueOnce({ data: existingProperty } as any);

            const result = await deleteProperty('prop-123');

            expect(result).toEqual(expect.objectContaining({ success: expect.any(String) }));
            expect(apiPatch).toHaveBeenCalledWith(
                '/api/properties/prop-123',
                expect.objectContaining({ isDisabled: true }),
                expect.any(Object)
            );
        });
    });

    describe('getPropertyById', () => {
        it('should fetch property even with empty id (API handles it)', async () => {
            // getPropertyById doesn't validate id, it just calls API
            const result = await getPropertyById('');

            expect(result).toEqual(expect.objectContaining({ data: expect.anything() }));
        });

        it('should fetch property successfully', async () => {
            const mockProperty = { id: 'prop-123', propertyName: 'Test Property' };
            vi.mocked(apiGet).mockResolvedValueOnce({ data: mockProperty } as any);

            const result = await getPropertyById('prop-123');

            expect(result).toEqual(expect.objectContaining({ data: mockProperty }));
            expect(apiGet).toHaveBeenCalledWith('/api/properties/prop-123', expect.any(Object));
        });
    });

    describe('createSplitProperty', () => {
        it('should call split create endpoint and return child mapping data', async () => {
            vi.mocked(apiPost).mockResolvedValueOnce({
                success: true,
                data: { childPropertyId: 'child-1', parentPropertyId: 'parent-1' },
                message: 'Split property created successfully',
            } as any);

            const result = await createSplitProperty({
                parentPropertyId: 'parent-1',
                sectionModes: {
                    DETAIL: 'CUSTOM',
                    ADDRESS: 'INHERIT',
                    GOOGLE_PLACE: 'INHERIT',
                    DAY_WISE_VARIABLES: 'INHERIT',
                    SPECIAL_DATES: 'INHERIT',
                    AMENITIES_ACTIVITIES: 'INHERIT',
                    SAFETY_HYGIENE: 'INHERIT',
                    SPACES: 'INHERIT',
                    PLANS: 'INHERIT',
                    OWNERS_MANAGERS_CARETAKERS: 'INHERIT',
                    OTHERS: 'INHERIT',
                },
                customOverrides: {
                    DETAIL: { propertyName: 'Split Child', propertyCode: 'SP-100' },
                },
            });

            expect(apiPost).toHaveBeenCalledWith(
                '/api/properties/admin/create-split-property',
                expect.objectContaining({ parentPropertyId: 'parent-1' }),
                expect.any(Object)
            );
            expect(result).toEqual(expect.objectContaining({
                success: expect.any(String),
                data: expect.objectContaining({ childPropertyId: 'child-1' }),
            }));
        });

        it('should return error when split endpoint fails', async () => {
            vi.mocked(apiPost).mockResolvedValueOnce({
                success: false,
                error: 'Child property code already exists',
            } as any);

            const result = await createSplitProperty({
                parentPropertyId: 'parent-1',
                sectionModes: {
                    DETAIL: 'CUSTOM',
                    ADDRESS: 'INHERIT',
                    GOOGLE_PLACE: 'INHERIT',
                    DAY_WISE_VARIABLES: 'INHERIT',
                    SPECIAL_DATES: 'INHERIT',
                    AMENITIES_ACTIVITIES: 'INHERIT',
                    SAFETY_HYGIENE: 'INHERIT',
                    SPACES: 'INHERIT',
                    PLANS: 'INHERIT',
                    OWNERS_MANAGERS_CARETAKERS: 'INHERIT',
                    OTHERS: 'INHERIT',
                },
                customOverrides: {
                    DETAIL: { propertyName: 'Split Child', propertyCode: 'SP-100' },
                },
            });

            expect(result).toEqual({ error: 'Child property code already exists' });
        });
    });

    describe('editPropertyFromPayload', () => {
        it('updates property and returns metadata', async () => {
            vi.mocked(apiPatch).mockResolvedValueOnce({
                success: true,
                data: { id: 'prop-123' },
                meta: { propertyId: 'prop-123' },
            } as any);

            const result = await editPropertyFromPayload('prop-123', {
                propertyName: 'Updated Draft',
                relationIntent: { amenities: 'unchanged' },
            });

            expect(apiPatch).toHaveBeenCalledWith(
                '/api/properties/prop-123',
                expect.objectContaining({
                    propertyName: 'Updated Draft',
                }),
                expect.any(Object)
            );
            expect(result).toEqual(
                expect.objectContaining({
                    success: expect.any(String),
                    data: {
                        propertyId: 'prop-123',
                    },
                })
            );
        });
    });

    describe('fetchPropertyFullData', () => {
        it('reads canonical tab payload from result.data', async () => {
            const canonicalTabs = {
                detail: { id: 'prop-123', brandId: 'brand-1' },
                address: { cityId: 'city-1' },
                googlePlace: {},
                commercials: {
                    'brand-1': { commissionPercentage: 12, specialDates: [] },
                },
                plans: {
                    'brand-1': { discountPlans: [{ id: 'dp-1' }] },
                },
                others: {
                    'brand-1': { description: 'desc' },
                },
                amenitiesActivities: { amenities: [], activities: [] },
                gallery: { gallery: [], coverPhotos: [] },
                spaces: { spaceProperties: [] },
                peopleRoles: { owners: [], managers: [], caretakers: [] },
            };

            vi.mocked(apiGet).mockResolvedValueOnce({
                success: true,
                data: canonicalTabs,
            } as any);

            const result = await fetchPropertyFullData('prop-123');

            expect(result).toEqual({ data: canonicalTabs });
            expect((result.data as any)).not.toHaveProperty('commercial');
            expect((result.data as any)).not.toHaveProperty('other');
        });

        it('returns non-canonical payload as-is when backend sends nested tabs', async () => {
            const legacyTabs = {
                detail: { id: 'prop-legacy', brandId: 'brand-1' },
                commercials: {
                    'brand-1': { securityDeposit: 5000, specialDates: [] },
                },
                plans: { 'brand-1': { discountPlans: [] } },
                others: { 'brand-1': { description: 'legacy fallback' } },
            };

            vi.mocked(apiGet).mockResolvedValueOnce({
                success: true,
                data: { tabs: legacyTabs },
            } as any);

            const result = await fetchPropertyFullData('prop-legacy');
            expect(result).toEqual({ data: { tabs: legacyTabs } });
        });
    });
});
