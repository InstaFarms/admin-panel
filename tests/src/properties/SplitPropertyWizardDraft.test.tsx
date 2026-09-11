import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import SplitPropertyWizard from "@/app/admin/properties/split-properties/create/SplitPropertyWizard";

const DRAFT_KEY = "admin:split-property-wizard:draft";

const PROPERTY = {
  id: "prop-1",
  propertyName: "Palm Grove Estate",
  propertyCode: "PGE",
  brandStatuses: [{ brandName: "Mago", isActive: true }],
};

const selectorResult = vi.fn(async () => ({ data: [PROPERTY] }));

vi.mock("@/actions/propertyActions", () => ({
  getAllPropertiesForSelector: vi.fn(() => selectorResult()),
  createSplitProperty: vi.fn(async () => ({ data: {} })),
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

/** Walk the wizard from step 0 to step 2 ("Configure Splits"). */
async function advanceToConfigureSplits() {
  fireEvent.click(await screen.findByText("Mago"));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  const search = await screen.findByPlaceholderText(/Search properties by name or code/i);
  fireEvent.change(search, { target: { value: "PGE" } });
  fireEvent.click(await screen.findByText("Palm Grove Estate", {}, { timeout: 3000 }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  await screen.findByText("Configure the splits");
}

describe("SplitPropertyWizard — local draft", () => {
  beforeEach(() => {
    localStorage.clear();
    toastCalls.length = 0;
    selectorResult.mockImplementation(async () => ({ data: [PROPERTY] }));
  });

  it("does not destroy a valid draft when Restore is clicked before the property list loads", async () => {
    // The banner renders straight from localStorage, but the staleness guard
    // checks against a list fetched asynchronously. On a slow API an admin can
    // click Restore while that list is still empty — the draft is valid and
    // must survive.
    let release: (() => void) | null = null;
    selectorResult.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ data: [PROPERTY] });
        })
    );

    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        value: {
          currentStep: 2,
          brandId: "mago",
          parentPropertyId: "prop-1",
          children: [{ name: "A", code: "A", type: "", codeName: "", slug: "a" }],
          assign: {},
          assignMode: "matrix",
        },
      })
    );

    render(<SplitPropertyWizard />);
    const restore = await screen.findByRole("button", { name: "Restore Draft" });

    // Disabled while the source list is in flight, so the guard can never run
    // against an empty list.
    expect(restore).toBeDisabled();
    fireEvent.click(restore);
    expect(localStorage.getItem(DRAFT_KEY), "a valid draft was destroyed mid-load").not.toBeNull();
    expect(toastCalls.some((m) => /no longer available/i.test(m))).toBe(false);

    // Once the list arrives it enables and restores normally.
    await act(async () => {
      release!();
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "Restore Draft" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Restore Draft" }));
    await screen.findByText("Configure the splits");
    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();
  });

  it("writes no draft while the wizard is untouched", async () => {
    render(<SplitPropertyWizard />);
    await screen.findByRole("heading", { name: "Select brand" });
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    // enabled=false at step 0 with no brand, so even an explicit save has
    // nothing meaningful — but the autosave must not have fired either.
    expect(screen.queryByRole("button", { name: "Restore Draft" })).toBeNull();
  });

  it("Save Draft stores real progress, and a remount offers it without applying it", async () => {
    const first = render(<SplitPropertyWizard />);
    await advanceToConfigureSplits();

    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY)!);
    expect(stored.value.parentPropertyId).toBe("prop-1");
    expect(stored.value.currentStep).toBe(2);

    // Remount = the browser reload the QA case describes.
    first.unmount();
    render(<SplitPropertyWizard />);

    // Offered, not auto-applied: still on step 0.
    const restore = await screen.findByRole("button", { name: "Restore Draft" });
    expect(screen.queryByText("Configure the splits")).toBeNull();

    fireEvent.click(restore);

    await screen.findByText("Configure the splits");
    expect(await screen.findByText(/Palm Grove Estate/)).toBeTruthy();
  });

  it("Discard removes the draft so it is not offered again", async () => {
    const first = render(<SplitPropertyWizard />);
    await advanceToConfigureSplits();
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    first.unmount();
    const second = render(<SplitPropertyWizard />);
    fireEvent.click(await screen.findByRole("button", { name: "Discard" }));
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();

    second.unmount();
    render(<SplitPropertyWizard />);
    await screen.findByRole("heading", { name: "Select brand" });
    expect(screen.queryByRole("button", { name: "Restore Draft" })).toBeNull();
  });

  it("refuses a draft whose source property no longer exists", async () => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        value: {
          currentStep: 2,
          brandId: "mago",
          parentPropertyId: "gone",
          children: [{ name: "A", code: "A", type: "", codeName: "", slug: "a" }],
          assign: {},
          assignMode: "matrix",
        },
      })
    );

    render(<SplitPropertyWizard />);
    fireEvent.click(await screen.findByRole("button", { name: "Restore Draft" }));

    await waitFor(() => expect(localStorage.getItem(DRAFT_KEY)).toBeNull());
    expect(toastCalls.some((m) => /no longer available/i.test(m))).toBe(true);
    // Crucially, it did NOT walk forward into the wizard against a dead source.
    expect(screen.queryByText("Configure the splits")).toBeNull();
  });
});
