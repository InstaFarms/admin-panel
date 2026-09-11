import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import MergePropertyWizard from "@/app/admin/properties/merge-properties/create/MergePropertyWizard";

const DRAFT_KEY = "admin:merge-property-wizard:draft";

const PROPERTIES = [
  { id: "p1", propertyName: "Palm Grove", propertyCode: "PG", brandStatuses: [{ brandName: "Mago", isActive: true }] },
  { id: "p2", propertyName: "Palm Ridge", propertyCode: "PR", brandStatuses: [{ brandName: "Mago", isActive: true }] },
];

vi.mock("@/actions/propertyActions", () => ({
  getAllPropertiesForSelector: vi.fn(async () => ({ data: PROPERTIES })),
  fetchPropertyFullData: vi.fn(async () => ({ data: {} })),
  createMergedProperty: vi.fn(async () => ({ data: {} })),
}));

vi.mock("@/lib/properties/fullPropertyData", () => ({
  toLegacyPropertySnapshot: () => ({}),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const toastCalls: string[] = [];
vi.mock("react-hot-toast", () => {
  const toast = Object.assign((m: string) => toastCalls.push(m), {
    success: (m: string) => toastCalls.push(m),
    error: (m: string) => toastCalls.push(m),
  });
  return { default: toast, toast };
});

const seedDraft = (over: Record<string, unknown> = {}) =>
  localStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({
      savedAt: Date.now(),
      value: {
        currentStep: 3, // Configure Merge
        brandId: "mago",
        selectedIds: ["p1", "p2"],
        primaryId: "p1",
        // Deliberately NOT what the primary-prefill effect would generate
        // (that would be name "Palm Grove", code "PG-M").
        mergeConfig: { name: "Hand Edited Name", code: "HAND-1", type: "", codeName: "", slug: "hand-edited" },
        winners: { ADDRESS: "p2" },
        ...over,
      },
    })
  );

describe("MergePropertyWizard — local draft", () => {
  beforeEach(() => {
    localStorage.clear();
    toastCalls.length = 0;
  });

  it("restores hand-edited config instead of letting the primary-prefill effect overwrite it", async () => {
    seedDraft();
    render(<MergePropertyWizard />);

    fireEvent.click(await screen.findByRole("button", { name: "Restore Draft" }));

    // The prefill effect fires on primaryId change and would reset these to
    // the primary's own values — the restore must win.
    const name = await screen.findByPlaceholderText("e.g. Sunset Villa Merged");
    await waitFor(() => expect((name as HTMLInputElement).value).toBe("Hand Edited Name"));

    const code = screen.getByPlaceholderText("e.g. SSVMERGE001-M") as HTMLInputElement;
    expect(code.value).toBe("HAND-1");
  });

  it("refuses a draft when one of its constituent properties is gone", async () => {
    seedDraft({ selectedIds: ["p1", "vanished"] });
    render(<MergePropertyWizard />);

    fireEvent.click(await screen.findByRole("button", { name: "Restore Draft" }));

    await waitFor(() => expect(localStorage.getItem(DRAFT_KEY)).toBeNull());
    expect(toastCalls.some((m) => /no longer available/i.test(m))).toBe(true);
    expect(screen.queryByPlaceholderText("e.g. Sunset Villa Merged")).toBeNull();
  });
});
