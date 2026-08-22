import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
    getUpcomingSettlements,
    getFailedWithdrawals,
    getPendingWithdrawals,
    getBlockedSettlements,
} from '@/actions/walletPageActions';

import { apiGet } from '@/utils/api-utils';

vi.mock('server-only', () => { return {}; });
vi.mock('next/headers', () => ({
    cookies: vi.fn(),
}));
vi.mock('@/utils/api-utils');

describe('walletPageActions', () => {
    beforeEach(async () => {
        vi.clearAllMocks();

        // Mock cookies to return token
        const { cookies } = await import('next/headers');
        vi.mocked(cookies).mockResolvedValue({
            get: () => ({ value: 'fake-token' }),
        } as any);

        // Mock apiGet
        vi.mocked(apiGet).mockResolvedValue({
            data: [],
        } as any);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    const createMockSearchParams = (limit: number = 10, offset: number = 0) => {
        // parseLimitOffset uses page and itemsPerPage, not limit/offset directly
        // offset = limit * (page - 1), so page = (offset / limit) + 1
        const page = limit > 0 && offset >= 0 ? Math.floor(offset / limit) + 1 : 1;
        return Promise.resolve({
            itemsPerPage: limit.toString(),
            page: page.toString(),
        });
    };

    describe('getUpcomingSettlements', () => {
        it('should fetch upcoming settlements with default pagination', async () => {
            const mockSettlements = [
                { id: 'settlement-1', amount: 1000, scheduledDate: '2024-01-15' },
                { id: 'settlement-2', amount: 2000, scheduledDate: '2024-01-20' },
            ];
            vi.mocked(apiGet).mockResolvedValueOnce({
                data: mockSettlements,
            } as any);

            const searchParams = createMockSearchParams(10, 0);
            const result = await getUpcomingSettlements(searchParams);

            expect(result).toEqual(mockSettlements);
            expect(apiGet).toHaveBeenCalledWith(
                expect.stringContaining('/api/wallet/settlements/upcoming'),
                expect.any(Object)
            );
        });

        it('should handle pagination parameters correctly', async () => {
            // Clear previous calls
            vi.clearAllMocks();
            
            const searchParams = createMockSearchParams(20, 40);
            await getUpcomingSettlements(searchParams);

            const callUrl = vi.mocked(apiGet).mock.calls[0][0] as string;
            expect(callUrl).toContain('limit=20');
            expect(callUrl).toContain('offset=40');
        });

        it('should throw error when API call fails', async () => {
            vi.mocked(apiGet).mockRejectedValueOnce(new Error('API Error'));

            const searchParams = createMockSearchParams();
            await expect(getUpcomingSettlements(searchParams)).rejects.toThrow('API Error');
        });

        it('should return empty array when no settlements found', async () => {
            vi.mocked(apiGet).mockResolvedValueOnce({
                data: [],
            } as any);

            const searchParams = createMockSearchParams();
            const result = await getUpcomingSettlements(searchParams);

            expect(result).toEqual([]);
        });
    });

    describe('getFailedWithdrawals', () => {
        it('should fetch failed withdrawals successfully', async () => {
            const mockWithdrawals = [
                { id: 'withdrawal-1', amount: 500, status: 'failed', error: 'Network error' },
                { id: 'withdrawal-2', amount: 1000, status: 'failed', error: 'Insufficient funds' },
            ];
            vi.mocked(apiGet).mockResolvedValueOnce({
                data: mockWithdrawals,
            } as any);

            const searchParams = createMockSearchParams();
            const result = await getFailedWithdrawals(searchParams);

            expect(result).toEqual(mockWithdrawals);
            expect(apiGet).toHaveBeenCalledWith(
                expect.stringContaining('/api/wallet/withdrawal-requests/failed'),
                expect.any(Object)
            );
        });

        it('should handle pagination correctly', async () => {
            // Clear previous calls
            vi.clearAllMocks();
            
            const searchParams = createMockSearchParams(15, 30);
            await getFailedWithdrawals(searchParams);

            const callUrl = vi.mocked(apiGet).mock.calls[0][0] as string;
            expect(callUrl).toContain('limit=15');
            expect(callUrl).toContain('offset=30');
        });

        it('should throw error when API call fails', async () => {
            vi.mocked(apiGet).mockRejectedValueOnce(new Error('Failed to fetch'));

            const searchParams = createMockSearchParams();
            await expect(getFailedWithdrawals(searchParams)).rejects.toThrow('Failed to fetch');
        });
    });

    describe('getPendingWithdrawals', () => {
        it('should fetch pending withdrawals successfully', async () => {
            const mockWithdrawals = [
                { id: 'withdrawal-1', amount: 500, status: 'pending', requestedAt: '2024-01-10' },
                { id: 'withdrawal-2', amount: 1000, status: 'pending', requestedAt: '2024-01-11' },
            ];
            vi.mocked(apiGet).mockResolvedValueOnce({
                data: mockWithdrawals,
            } as any);

            const searchParams = createMockSearchParams();
            const result = await getPendingWithdrawals(searchParams);

            expect(result).toEqual(mockWithdrawals);
            expect(apiGet).toHaveBeenCalledWith(
                expect.stringContaining('/api/wallet/withdrawal-requests/pending'),
                expect.any(Object)
            );
        });

        it('should handle pagination correctly', async () => {
            // Clear previous calls
            vi.clearAllMocks();
            
            const searchParams = createMockSearchParams(25, 50);
            await getPendingWithdrawals(searchParams);

            const callUrl = vi.mocked(apiGet).mock.calls[0][0] as string;
            expect(callUrl).toContain('limit=25');
            expect(callUrl).toContain('offset=50');
        });

        it('should throw error when API call fails', async () => {
            vi.mocked(apiGet).mockRejectedValueOnce(new Error('Network error'));

            const searchParams = createMockSearchParams();
            await expect(getPendingWithdrawals(searchParams)).rejects.toThrow('Network error');
        });
    });

    describe('getBlockedSettlements', () => {
        it('should fetch blocked settlements successfully', async () => {
            const mockSettlements = [
                { id: 'settlement-1', amount: 1000, blockedAt: '2024-01-05', reason: 'Dispute' },
                { id: 'settlement-2', amount: 2000, blockedAt: '2024-01-06', reason: 'Verification' },
            ];
            vi.mocked(apiGet).mockResolvedValueOnce({
                data: mockSettlements,
            } as any);

            const searchParams = createMockSearchParams();
            const result = await getBlockedSettlements(searchParams);

            expect(result).toEqual(mockSettlements);
            expect(apiGet).toHaveBeenCalledWith(
                expect.stringContaining('/api/wallet/settlements/blocked'),
                expect.any(Object)
            );
        });

        it('should handle pagination correctly', async () => {
            // Clear previous calls
            vi.clearAllMocks();
            
            const searchParams = createMockSearchParams(30, 60);
            await getBlockedSettlements(searchParams);

            const callUrl = vi.mocked(apiGet).mock.calls[0][0] as string;
            expect(callUrl).toContain('limit=30');
            expect(callUrl).toContain('offset=60');
        });

        it('should throw error when API call fails', async () => {
            vi.mocked(apiGet).mockRejectedValueOnce(new Error('Server error'));

            const searchParams = createMockSearchParams();
            await expect(getBlockedSettlements(searchParams)).rejects.toThrow('Server error');
        });

        it('should return empty array when no blocked settlements found', async () => {
            vi.mocked(apiGet).mockResolvedValueOnce({
                data: [],
            } as any);

            const searchParams = createMockSearchParams();
            const result = await getBlockedSettlements(searchParams);

            expect(result).toEqual([]);
        });
    });

    describe('Common behaviors', () => {
        it('should use correct authentication token for all functions', async () => {
            const searchParams = createMockSearchParams();

            await getUpcomingSettlements(searchParams);
            await getFailedWithdrawals(searchParams);
            await getPendingWithdrawals(searchParams);
            await getBlockedSettlements(searchParams);

            // All calls should include token in options
            vi.mocked(apiGet).mock.calls.forEach((call) => {
                const options = call[1];
                expect(options).toHaveProperty('token');
            });
        });

        it('should handle missing search params gracefully', async () => {
            const emptyParams = Promise.resolve({});
            vi.mocked(apiGet).mockResolvedValueOnce({ data: [] } as any);

            const result = await getUpcomingSettlements(emptyParams);

            expect(result).toEqual([]);
            // Should use default limit/offset from parseLimitOffset
        });
    });
});
