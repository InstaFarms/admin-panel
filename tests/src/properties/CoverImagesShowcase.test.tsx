import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CoverImagesShowcase from "@/components/properties/gallery-section/CoverImagesShowcase";

vi.mock("flowbite-react", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/actions/propertyActions", () => ({
  fetchAllCoverPhotosNeedsConversion: vi.fn(),
  fetchPropertyCoverPhotos: vi.fn(),
  updatePropertyCoverPhotos: vi.fn(),
}));

vi.mock("@/actions/imageActions", () => ({
  convertSingleCoverImage: vi.fn(),
}));

vi.mock("@/components/properties/gallery-section/FullSizeImageModal", () => ({
  __esModule: true,
  default: () => <div data-testid="full-size-image-modal" />,
}));

vi.mock("@/components/properties/gallery-section/BulkCoverConvertModal", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/components/properties/gallery-section/cover-images", () => ({
  PREVIEW_WIDTH_MIN: 320,
  PREVIEW_WIDTH_MAX: 1440,
  PRESET_WIDTHS: { mobile: 375, tablet: 768, laptop: 1280 },
  getSimulatedViewport: () => "laptop",
  CoverImagesLoadingState: () => <div data-testid="cover-loading" />,
  CoverImagesEmptyState: ({ onGoToUpload }: { onGoToUpload?: () => void }) => (
    <div>
      <p>No cover images yet</p>
      {onGoToUpload ? <button onClick={onGoToUpload}>Go to Upload</button> : null}
    </div>
  ),
  CoverPreviewToggle: () => <div data-testid="cover-preview-toggle" />,
  CoverResizeHandle: () => <div data-testid="cover-resize-handle" />,
  CoverWebsitePreviewView: () => <div data-testid="cover-website-preview" />,
  CoverCardsView: () => <div data-testid="cover-cards-view" />,
}));

describe("CoverImagesShowcase", () => {
  it("shows the unified refresh button even when the current property has no cover images (mago scope)", () => {
    render(
      <CoverImagesShowcase
        propertyId="prop-1"
        brandScope="mago"
        serverCoverPhotos={[]}
        draftCoverPhotos={[null, null, null, null, null]}
        onChangeDraftCoverPhotos={vi.fn()}
        onSaved={vi.fn()}
        loading={false}
        imageViewMode="original"
        onEdit={vi.fn()}
        onGoToUpload={vi.fn()}
      />,
    );

    expect(screen.getByText("Refresh cover images")).toBeInTheDocument();
    expect(screen.getByText("No cover images yet")).toBeInTheDocument();
    expect(screen.getByText(/global cover rebuild for all properties/i)).toBeInTheDocument();
  });

  it("shows the unified refresh button when the active brand is Instafarms", () => {
    render(
      <CoverImagesShowcase
        propertyId="prop-1"
        brandScope="instafarms"
        serverCoverPhotos={[]}
        draftCoverPhotos={[null, null, null, null, null]}
        onChangeDraftCoverPhotos={vi.fn()}
        onSaved={vi.fn()}
        loading={false}
        imageViewMode="original"
        onEdit={vi.fn()}
        onGoToUpload={vi.fn()}
      />,
    );

    expect(screen.getByText("Refresh cover images")).toBeInTheDocument();
    expect(screen.getByText(/global cover rebuild for all properties/i)).toBeInTheDocument();
  });
});
