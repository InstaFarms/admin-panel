import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePropertyEditorState } from "@/components/properties/editor/usePropertyEditorState";
import { createEmptyPropertyEditorDraft } from "@/lib/properties/propertyEditorDraft";

const baseSnapshot = (() => {
  const draft = createEmptyPropertyEditorDraft();
  draft.instafarms.detail = { propertyName: "Seed", showOnInstafarms: true };
  draft.instafarms.commercial = { commissionPercentage: 10 };
  return draft;
})();

describe("usePropertyEditorState", () => {
  it("tracks dirty paths and sections for nested brand updates", () => {
    const { result } = renderHook(() => usePropertyEditorState(baseSnapshot));

    act(() => {
      result.current.patchAtPath("instafarms.commercial.commissionPercentage", 15);
    });

    expect(result.current.isDirty).toBe(true);
    expect(result.current.dirtyPaths).toContain(
      "instafarms.commercial.commissionPercentage",
    );
    expect(result.current.dirtySections).toContain("instafarms.commercial");
  });

  it("commitDraft resets dirty tracking", () => {
    const { result } = renderHook(() => usePropertyEditorState(baseSnapshot));

    act(() => {
      result.current.patchAtPath("instafarms.detail.propertyName", "Updated");
    });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.commitDraft();
    });
    expect(result.current.isDirty).toBe(false);
    expect(result.current.dirtyPaths).toEqual([]);
  });

  it("resetDraft restores server snapshot values", () => {
    const { result } = renderHook(() => usePropertyEditorState(baseSnapshot));

    act(() => {
      result.current.patchAtPath("instafarms.detail.propertyName", "Changed");
    });
    expect(result.current.draft.instafarms.detail.propertyName).toBe("Changed");

    act(() => {
      result.current.resetDraft();
    });
    expect(result.current.draft.instafarms.detail.propertyName).toBe("Seed");
  });
});

