import { vi } from 'vitest';

export const mockServerModules = () => {
    vi.mock('server-only', () => { return {}; });
    vi.mock('next/cache', () => ({
        revalidatePath: vi.fn(),
    }));
};
