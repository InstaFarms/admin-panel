import { vi } from "vitest";

export const mockReactHotToastFactory = () => {
    const toastMock = {
        error: vi.fn(),
        success: vi.fn(),
        dismiss: vi.fn(),
        loading: vi.fn(),
    };
    return {
        default: toastMock,
        toast: toastMock
    };
};

export const mockNextNavigationFactory = () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        refresh: vi.fn(),
        prefetch: vi.fn(),
    }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => "/",
});

export const mockNextImageFactory = () => ({
    default: (props: any) => <img {...props} alt={props.alt || ""} />
});
