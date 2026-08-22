import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createStaticImage, updateStaticImage, deleteStaticImage } from '@/actions/staticImageActions';

import { isAdmin } from '@/utils/admin-only';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/utils/api-utils';
import { deleteImageAction } from '@/actions/imageActions';

vi.mock('server-only', () => { return {}; });
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));
vi.mock('next/headers', () => ({
    cookies: vi.fn(),
}));
vi.mock('@/utils/admin-only');
vi.mock('@/utils/api-utils');
vi.mock('@/actions/imageActions');
vi.mock('@/utils/firebase-admin', () => ({
    adminStorage: {
        bucket: vi.fn(() => ({
            file: vi.fn(() => ({
                delete: vi.fn(),
            })),
        })),
    },
}));

describe('staticImageActions', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        
        // Mock cookies to return token
        const { cookies } = await import('next/headers');
        vi.mocked(cookies).mockResolvedValue({
            get: () => ({ value: 'fake-token' }),
        } as any);
        
        // Fix isAdmin mock to return object instead of boolean
        vi.mocked(isAdmin).mockResolvedValue({
            id: 'admin-123',
            email: 'admin@example.com',
            phoneNumber: '1234567890',
            firstName: 'Admin',
            lastName: 'User'
        });

        // Mock apiGet, apiPost, apiPatch, apiDelete
        vi.mocked(apiGet).mockResolvedValue({ data: 0 } as any);
        vi.mocked(apiPost).mockResolvedValue({ success: true } as any);
        vi.mocked(apiPatch).mockResolvedValue({ success: true } as any);
        vi.mocked(apiDelete).mockResolvedValue({ success: true } as any);
        vi.mocked(deleteImageAction).mockResolvedValue({ success: true } as any);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('createStaticImage', () => {
        const createBaseData = () => ({
            section: 'homepage_hero' as const,
            title: 'Test Image',
            desktopImageUrl: 'https://example.com/desktop.jpg',
            desktopImagePath: 'static-images/desktop/test.jpg',
            mobileImageUrl: 'https://example.com/mobile.jpg',
            mobileImagePath: 'static-images/mobile/test.jpg',
        });

        it('should return error if section or title is missing', async () => {
            const data = createBaseData();
            delete (data as any).section;

            const result = await createStaticImage(data as any);

            expect(result).toEqual({ error: 'Title is required' });
            expect(apiPost).not.toHaveBeenCalled();
        });

        it('should return error if desktop or mobile image URL is missing', async () => {
            const data = createBaseData();
            delete (data as any).desktopImageUrl;

            const result = await createStaticImage(data as any);

            expect(result).toEqual({ error: 'Both desktop and mobile images are required' });
            expect(apiPost).not.toHaveBeenCalled();
        });

        it('should create static image successfully with all required fields', async () => {
            const data = createBaseData();

            const result = await createStaticImage(data);

            expect(result).toEqual({ success: 'Static image created successfully' });
            expect(apiPost).toHaveBeenCalledWith(
                '/api/static-images',
                expect.objectContaining({
                    section: 'homepage_hero',
                    title: 'Test Image',
                    desktopImageUrl: data.desktopImageUrl,
                    mobileImageUrl: data.mobileImageUrl,
                    isActive: true,
                }),
                expect.any(Object)
            );
        });

        it('should get max sort order when sortOrder is 0', async () => {
            const data = { ...createBaseData(), sortOrder: 0 };
            vi.mocked(apiGet).mockResolvedValueOnce({ data: 5 } as any);

            await createStaticImage(data);

            expect(apiGet).toHaveBeenCalledWith(
                '/api/static-images/max-sort-order/homepage_hero',
                expect.any(Object)
            );
            expect(apiPost).toHaveBeenCalledWith(
                '/api/static-images',
                expect.objectContaining({ sortOrder: 6 }),
                expect.any(Object)
            );
        });

        it('should return error if unauthorized', async () => {
            vi.mocked(isAdmin).mockResolvedValue(null);

            const result = await createStaticImage(createBaseData());

            expect(result).toEqual({ error: expect.stringMatching(/Unauthorized/) });
        });
    });

    describe('updateStaticImage', () => {
        const updateBaseData = () => ({
            title: 'Updated Title',
        });

        it('should return error if id is missing', async () => {
            const result = await updateStaticImage('', updateBaseData());

            expect(result).toEqual({ error: 'Invalid static image ID' });
            expect(apiPatch).not.toHaveBeenCalled();
        });

        it('should return error if static image not found', async () => {
            vi.mocked(apiGet).mockResolvedValueOnce({ data: null } as any);

            const result = await updateStaticImage('invalid-id', updateBaseData());

            expect(result).toEqual({ error: 'Static image not found' });
            expect(apiPatch).not.toHaveBeenCalled();
        });

        it('should update static image successfully', async () => {
            const existingImage = {
                id: 'img-1',
                desktopImagePath: 'old/desktop.jpg',
                mobileImagePath: 'old/mobile.jpg',
            };
            vi.mocked(apiGet).mockResolvedValueOnce({ data: existingImage } as any);

            const result = await updateStaticImage('img-1', updateBaseData());

            expect(result).toEqual({ success: 'Static image updated successfully' });
            expect(apiPatch).toHaveBeenCalledWith(
                '/api/static-images/img-1',
                expect.objectContaining({ title: 'Updated Title' }),
                expect.any(Object)
            );
        });

        it('should delete old images when new ones are provided', async () => {
            const existingImage = {
                id: 'img-1',
                desktopImagePath: 'old/desktop.jpg',
                mobileImagePath: 'old/mobile.jpg',
            };
            vi.mocked(apiGet).mockResolvedValueOnce({ data: existingImage } as any);

            const updateData = {
                desktopImagePath: 'new/desktop.jpg',
                mobileImagePath: 'new/mobile.jpg',
            };

            await updateStaticImage('img-1', updateData, 'old/desktop.jpg', 'old/mobile.jpg');

            expect(deleteImageAction).toHaveBeenCalledWith('old/desktop.jpg');
            expect(deleteImageAction).toHaveBeenCalledWith('old/mobile.jpg');
        });

        it('should return error if unauthorized', async () => {
            vi.mocked(isAdmin).mockResolvedValue(null);

            const result = await updateStaticImage('img-1', updateBaseData());

            expect(result).toEqual({ error: expect.stringMatching(/Unauthorized/) });
        });
    });

    describe('deleteStaticImage', () => {
        it('should return error if id is missing', async () => {
            const result = await deleteStaticImage('');

            expect(result).toEqual({ error: 'Invalid static image ID' });
            expect(apiDelete).not.toHaveBeenCalled();
        });

        it('should return error if static image not found', async () => {
            vi.mocked(apiGet).mockResolvedValueOnce({ data: null } as any);

            const result = await deleteStaticImage('invalid-id');

            expect(result).toEqual({ error: 'Static image not found' });
            expect(apiDelete).not.toHaveBeenCalled();
        });

        it('should delete static image and associated files successfully', async () => {
            const staticImage = {
                id: 'img-1',
                desktopImagePath: 'static-images/desktop/test.jpg',
                mobileImagePath: 'static-images/mobile/test.jpg',
            };
            vi.mocked(apiGet).mockResolvedValueOnce({ data: staticImage } as any);

            const result = await deleteStaticImage('img-1');

            expect(result).toEqual({ success: 'Static image deleted successfully' });
            expect(apiDelete).toHaveBeenCalledWith('/api/static-images/img-1', expect.any(Object));
            expect(deleteImageAction).toHaveBeenCalledWith('static-images/desktop/test.jpg');
            expect(deleteImageAction).toHaveBeenCalledWith('static-images/mobile/test.jpg');
        });

        it('should handle missing image paths gracefully', async () => {
            const staticImage = {
                id: 'img-1',
                desktopImagePath: null,
                mobileImagePath: null,
            };
            vi.mocked(apiGet).mockResolvedValueOnce({ data: staticImage } as any);

            const result = await deleteStaticImage('img-1');

            expect(result).toEqual({ success: 'Static image deleted successfully' });
            expect(apiDelete).toHaveBeenCalled();
            expect(deleteImageAction).not.toHaveBeenCalled();
        });

        it('should return error if unauthorized', async () => {
            vi.mocked(isAdmin).mockResolvedValue(null);

            const result = await deleteStaticImage('img-1');

            expect(result).toEqual({ error: expect.stringMatching(/Unauthorized/) });
        });
    });
});
