import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import BulkCoverConvertModal from "@/components/properties/gallery-section/BulkCoverConvertModal";

vi.mock("flowbite-react", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

describe("BulkCoverConvertModal", () => {
  it("renders expanded live progress details with brand badges", () => {
    render(
      <BulkCoverConvertModal
        show
        minimized={false}
        properties={[
          {
            propertyId: "prop-1",
            propertyName: "Mago Retreat",
            totalCovers: 3,
            convertedCount: 1,
            status: "Converting",
            brand: "mago",
            message: "Converting cover 2 of 3 for slot 2.",
          },
        ]}
        totalConverted={1}
        totalPropertiesDone={0}
        isProcessing
        stoppedByUser={false}
        userRequestedStop={false}
        error={null}
        onClose={vi.fn()}
        onPauseOrCancel={vi.fn()}
        onToggleMinimize={vi.fn()}
      />,
    );

    expect(screen.getByText("Global Cover Refresh")).toBeInTheDocument();
    expect(screen.getByText("Live property queue")).toBeInTheDocument();
    expect(screen.getByText("Stop After Current Property")).toBeInTheDocument();
    expect(screen.getAllByText("Mago Retreat").length).toBeGreaterThan(0);
    expect(screen.getByText("Converting cover 2 of 3 for slot 2.")).toBeInTheDocument();
    expect(screen.getByText("Mago")).toBeInTheDocument();
  });

  it("shows the minimized summary and restore control", () => {
    const onToggleMinimize = vi.fn();

    render(
      <BulkCoverConvertModal
        show
        minimized
        properties={[
          {
            propertyId: "prop-1",
            propertyName: "Mago Retreat",
            totalCovers: 2,
            convertedCount: 2,
            status: "Done",
            brand: "mago",
            message: "Finished regenerating 2 cover images.",
          },
        ]}
        totalConverted={2}
        totalPropertiesDone={1}
        isProcessing={false}
        stoppedByUser={false}
        userRequestedStop={false}
        error={null}
        onClose={vi.fn()}
        onPauseOrCancel={vi.fn()}
        onToggleMinimize={onToggleMinimize}
      />,
    );

    expect(screen.getByText("Processing complete")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Restore progress console"));
    expect(onToggleMinimize).toHaveBeenCalledTimes(1);
  });

  it("shows combined brand copy and scanning text when processing with no items yet", () => {
    render(
      <BulkCoverConvertModal
        show
        minimized={false}
        properties={[]}
        totalConverted={0}
        totalPropertiesDone={0}
        isProcessing
        stoppedByUser={false}
        userRequestedStop={false}
        error={null}
        onClose={vi.fn()}
        onPauseOrCancel={vi.fn()}
        onToggleMinimize={vi.fn()}
      />,
    );

    expect(screen.getByText("Global Cover Refresh")).toBeInTheDocument();
    expect(
      screen.getByText("Scanning properties with cover images that still need conversion..."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("This run processes Instafarms (from original) and Mago (from watermarked) cover images. Existing gallery photos stay intact."),
    ).toBeInTheDocument();
  });
});
