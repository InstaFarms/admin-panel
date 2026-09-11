import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocalDraft } from "@/app/admin/properties/split-properties/create/hooks/useLocalDraft";

const KEY = "test:draft";

describe("useLocalDraft", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not autosave while disabled, so an untouched wizard leaves no draft behind", () => {
    renderHook(() => useLocalDraft({ key: KEY, value: { step: 0 }, enabled: false, intervalMs: 1000 }));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("autosaves once enabled", () => {
    renderHook(() => useLocalDraft({ key: KEY, value: { step: 2 }, enabled: true, intervalMs: 1000 }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(JSON.parse(localStorage.getItem(KEY)!).value).toEqual({ step: 2 });
  });

  it("keeps autosaving even when the value changes on every render", () => {
    // Guards the timer-restart bug: depending on `value` would reset the
    // interval on each keystroke and the save would never fire.
    let step = 0;
    const { rerender } = renderHook(() =>
      useLocalDraft({ key: KEY, value: { step }, enabled: true, intervalMs: 1000 })
    );
    for (let i = 0; i < 5; i++) {
      step += 1;
      rerender();
      act(() => {
        vi.advanceTimersByTime(300);
      });
    }
    // t=1500 after the loop; push past the next tick so it fires with step=5.
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(JSON.parse(localStorage.getItem(KEY)!).value).toEqual({ step: 5 });
  });

  it("saveNow writes immediately but does not raise the restore prompt mid-edit", () => {
    const { result } = renderHook(() => useLocalDraft({ key: KEY, value: { step: 3 }, enabled: true }));
    act(() => {
      result.current.saveNow();
    });
    expect(JSON.parse(localStorage.getItem(KEY)!).value).toEqual({ step: 3 });
    expect(result.current.hasDraft).toBe(false);
  });

  it("offers a stored draft on mount, with its timestamp", () => {
    localStorage.setItem(KEY, JSON.stringify({ savedAt: 1700000000000, value: { step: 4 } }));
    const { result } = renderHook(() => useLocalDraft({ key: KEY, value: { step: 0 }, enabled: false }));
    expect(result.current.hasDraft).toBe(true);
    expect(result.current.draft?.value).toEqual({ step: 4 });
    expect(result.current.draft?.savedAt).toBe(1700000000000);
  });

  it("discards an unreadable leftover instead of offering it", () => {
    localStorage.setItem(KEY, "{not json");
    const { result } = renderHook(() => useLocalDraft({ key: KEY, value: { step: 0 }, enabled: false }));
    expect(result.current.hasDraft).toBe(false);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("clearDraft removes the stored draft", () => {
    localStorage.setItem(KEY, JSON.stringify({ savedAt: 1, value: { step: 4 } }));
    const { result } = renderHook(() => useLocalDraft({ key: KEY, value: { step: 0 }, enabled: false }));
    act(() => {
      result.current.clearDraft();
    });
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(result.current.hasDraft).toBe(false);
  });
});
