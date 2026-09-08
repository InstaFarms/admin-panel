import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("flowbite-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("flowbite-react")>();
  return {
    ...actual,
    Button: ({
      children,
      onClick,
      disabled,
      as: Component = "button",
      ...props
    }: any) => (
      <Component onClick={onClick} disabled={disabled} {...props}>
        {children}
      </Component>
    ),
    Label: ({ children, ...props }: any) => (
      <label {...props}>{children}</label>
    ),
    Textarea: (props: any) => <textarea {...props} />,
  };
});
vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));
vi.mock("@/actions/propertyOnboardingSubmissionActions", () => ({
  getPropertyOnboardingReviewQueue: vi.fn(),
  getPropertyOnboardingSubmission: vi.fn(),
  reviewPropertyOnboardingSubmission: vi.fn(),
}));

import PropertyOnboardingSubmissionsPage from "@/app/admin/property-onboarding/submissions/page";
import { getPropertyOnboardingReviewQueue } from "@/actions/propertyOnboardingSubmissionActions";

describe("PropertyOnboardingSubmissionsPage", () => {
  beforeEach(() => {
    vi.mocked(getPropertyOnboardingReviewQueue).mockResolvedValue({
      success: true,
      data: {
        submissions: [],
        unreadNotificationCount: 0,
        frozenBaselines: [
          {
            id: "baseline-1",
            propertyName: "Hilltop Retreat",
            versionNumber: 1,
            frozenAt: "2026-08-29T12:00:00.000Z",
          },
        ],
      },
    });
  });

  it("replaces raw snapshots with a per-baseline Excel download", async () => {
    const { container } = render(<PropertyOnboardingSubmissionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Hilltop Retreat")).toBeInTheDocument();
    });

    const download = screen.getByRole("link", { name: /download excel/i });
    expect(download).toHaveAttribute(
      "href",
      "/admin/property-onboarding/submissions/baselines/baseline-1/export",
    );
    expect(container.querySelector("pre")).toBeNull();
  });
});
