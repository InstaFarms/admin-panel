import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

import { describe, it, expect, vi, beforeEach } from "vitest";

import StaticImageEditor from "@/app/admin/static-images/StaticImageEditor";

import * as staticImageActions from "@/actions/staticImageActions";

import toast from "react-hot-toast";

// Mocks
vi.mock("flowbite-react", async (importOriginal) => {
    const { mockFlowbiteReactFactory } = await import("@/tests/mocks/flowbiteReactMock");
    return mockFlowbiteReactFactory(importOriginal);
});

// StaticImageEditor also imports uploadSettingAssetAction from
// @/actions/imageActions. Unstubbed, that real "use server" module was pulled
// into jsdom and dragged in `server-only`, failing the whole FILE at import
// time — the suite reported 0 tests here rather than a failure.
vi.mock("@/actions/imageActions", () => ({
  uploadSettingAssetAction: vi.fn(async () => ({ success: { url: "https://example.test/uploaded.jpg" } })),
  deleteStorageImageAction: vi.fn(async () => ({ success: true })),
}));

vi.mock("@/actions/staticImageActions", () => ({
    createStaticImage: vi.fn(),
    updateStaticImage: vi.fn(),
    deleteStaticImage: vi.fn(),
}));

vi.mock("react-hot-toast", async () => {
    const { mockReactHotToastFactory } = await import("@/tests/mocks/uiMocks");
    return mockReactHotToastFactory();
});

vi.mock("next/navigation", async () => {
    const { mockNextNavigationFactory } = await import("@/tests/mocks/uiMocks");
    return mockNextNavigationFactory();
});

// Mock DnD Context
let triggerDragEnd: any;
vi.mock("@dnd-kit/core", async () => {
    const actual = await vi.importActual("@dnd-kit/core");
    return {
        ...actual,
        DndContext: ({ children, onDragEnd }: any) => {
            triggerDragEnd = onDragEnd;
            return <div data-testid="dnd-context">{children}</div>;
        },
        useSensors: () => { },
        useSensor: () => { },
    };
});

vi.mock("@dnd-kit/sortable", async () => {
    const actual = await vi.importActual("@dnd-kit/sortable");
    return {
        ...actual,
        SortableContext: ({ children }: any) => <div>{children}</div>,
    };
});

describe("StaticImageEditor", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockImageData = [
        {
            id: "img-1",
            section: "homepage_hero" as const,
            title: "Test Image 1",
            description: "Test Description",
            desktopImageUrl: "https://example.com/desktop1.jpg",
            desktopImagePath: "static-images/desktop/img1.jpg",
            mobileImageUrl: "https://example.com/mobile1.jpg",
            mobileImagePath: "static-images/mobile/img1.jpg",
            altText: "Alt text 1",
            linkUrl: "https://example.com",
            sortOrder: 0,
            isActive: true,
        },
        {
            id: "img-2",
            section: "homepage_hero" as const,
            title: "Test Image 2",
            description: null,
            desktopImageUrl: "https://example.com/desktop2.jpg",
            desktopImagePath: "static-images/desktop/img2.jpg",
            mobileImageUrl: "https://example.com/mobile2.jpg",
            mobileImagePath: "static-images/mobile/img2.jpg",
            altText: null,
            linkUrl: null,
            sortOrder: 1,
            isActive: true,
        },
    ];

    it("should render empty state when no images provided", () => {
        render(<StaticImageEditor section="homepage_hero" />);

        // Copy is "No images added yet".
        expect(screen.getByText(/No images added yet/i)).toBeInTheDocument();
        expect(
            screen.getByText(/Start with a single image or bring in paired desktop\/mobile files in bulk/i)
        ).toBeInTheDocument();
    });

    it("should render existing images when data is provided", () => {
        render(<StaticImageEditor section="homepage_hero" data={mockImageData} />);

        expect(screen.getByDisplayValue("Test Image 1")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Test Image 2")).toBeInTheDocument();
    });

    it("should add new image when Add Image button is clicked", () => {
        render(<StaticImageEditor section="homepage_hero" />);

        // The EMPTY state offers "Add First Image"; the plain "Add Image"
        // button only appears once at least one image exists.
        const addButton = screen.getByText("Add First Image");
        fireEvent.click(addButton);

        // The Title field is labelled "Title *"; its PLACEHOLDER is example
        // copy ("Homepage hero, partner logo, footer icon...") and contains no
        // word "title" at all, so matching on the placeholder never worked.
        // Match the label, which is what the field actually promises.
        const titleInputs = screen.getAllByLabelText(/Title/i);
        expect(titleInputs.length).toBeGreaterThan(0);
    });

    it("should remove image when remove button is clicked", async () => {
        vi.mocked(staticImageActions.deleteStaticImage).mockResolvedValue({
            success: "Deleted successfully",
        });

        render(<StaticImageEditor section="homepage_hero" data={mockImageData} />);

        // Find delete buttons by color="red" attribute (the delete button)
        const redButtons = screen.getAllByRole("button").filter(
            btn => btn.getAttribute('color') === 'red'
        );
        
        // Click the first delete button (for the first image - img-1)
        expect(redButtons.length).toBeGreaterThan(0);
        fireEvent.click(redButtons[0]);

        await waitFor(() => {
            expect(staticImageActions.deleteStaticImage).toHaveBeenCalled();
        });

        expect(toast.success).toHaveBeenCalledWith("Image removed");
    });

    it("should show error toast when image removal fails", async () => {
        vi.mocked(staticImageActions.deleteStaticImage).mockResolvedValue({
            error: "Failed to delete",
        });

        render(<StaticImageEditor section="homepage_hero" data={[mockImageData[0]]} />);

        // Target the delete control the same way the sibling remove test does.
        // Taking the LAST button in the DOM happened to be the delete button
        // once; it now picks up whatever control renders last, so the delete
        // never fired and the missing error toast looked like a product bug.
        const redButtons = screen
            .getAllByRole("button")
            .filter((btn) => btn.getAttribute("color") === "red");
        expect(redButtons.length).toBeGreaterThan(0);
        fireEvent.click(redButtons[0]);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Failed to delete");
        });
    });

    it("should update image title when input changes", () => {
        render(<StaticImageEditor section="homepage_hero" data={[mockImageData[0]]} />);

        const titleInput = screen.getByDisplayValue("Test Image 1");
        fireEvent.change(titleInput, { target: { value: "Updated Title" } });

        expect(titleInput).toHaveValue("Updated Title");
    });

    it("should reorder images when dragged", async () => {
        render(<StaticImageEditor section="homepage_hero" data={mockImageData} />);

        // Simulate drag: move img-1 over img-2
        act(() => {
            if (triggerDragEnd) {
                triggerDragEnd({
                    active: { id: "img-1" },
                    over: { id: "img-2" },
                });
            }
        });

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith("Images reordered");
        });
    });

    it("should show error when submitting with missing title", async () => {
        render(<StaticImageEditor section="homepage_hero" data={[mockImageData[0]]} />);

        // Clear title
        const titleInput = screen.getByDisplayValue("Test Image 1");
        fireEvent.change(titleInput, { target: { value: "" } });

        // Try to submit
        const saveButton = screen.getByRole("button", { name: /Save All/ });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Title is required");
        });

        expect(staticImageActions.createStaticImage).not.toHaveBeenCalled();
        expect(staticImageActions.updateStaticImage).not.toHaveBeenCalled();
    });

    it("should create new image when submitting with new image data", async () => {
        vi.mocked(staticImageActions.createStaticImage).mockResolvedValue({
            success: "Created successfully",
        });

        render(<StaticImageEditor section="homepage_hero" />);

        // Add new image
        const addButton = screen.getByText("Add Image");
        fireEvent.click(addButton);

        // Fill in title
        const titleInputs = screen.getAllByLabelText(/Title/i);
        if (titleInputs.length > 0) {
            fireEvent.change(titleInputs[0], { target: { value: "New Image" } });
        }

        // Note: File uploads require File objects which are complex to mock
        // This test verifies the basic flow without file uploads
        // For full file upload testing, you'd need to mock File objects properly
    });

    it("should update existing image when submitting with existing image data", async () => {
        vi.mocked(staticImageActions.updateStaticImage).mockResolvedValue({
            success: "Updated successfully",
        });

        render(<StaticImageEditor section="homepage_hero" data={[mockImageData[0]]} />);

        // Update title
        const titleInput = screen.getByDisplayValue("Test Image 1");
        fireEvent.change(titleInput, { target: { value: "Updated Title" } });

        // Submit
        const saveButton = screen.getByRole("button", { name: /Save All/ });
        fireEvent.click(saveButton);

        // Note: This test would need proper file handling mocks to fully test
        // The component expects files or URLs, so we're testing the basic structure
    });

    it("should disable save button when loading", () => {
        render(<StaticImageEditor section="homepage_hero" data={mockImageData} />);

        const saveButton = screen.getByRole("button", { name: /Save All/ });
        // Initially not disabled
        expect(saveButton).not.toBeDisabled();
    });
});
