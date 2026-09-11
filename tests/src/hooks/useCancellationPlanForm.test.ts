/**
 * The boundary gap in a cancellation policy — QA checklist #191.
 *
 * Tiers are matched with STRICT inequalities (selectCancellationRule in
 * packages/services/src/cancellation-service.ts), so "more than 7 days" and
 * "fewer than 7 days" BOTH exclude day 7. Two tiers that read as if they meet
 * at a boundary actually leave that day matching no tier at all, and a guest
 * cancelling exactly then is refunded 0% silently — not the 50% or 100% either
 * tier's own label implies.
 *
 * The evaluation side is deliberately strict and returns null for that day
 * (see cancellation-rule-selection.test.ts, "gives nothing exactly on a
 * boundary — the bands are strict"). Closing the gap is the policy AUTHOR's
 * job, which is what these tests cover: the editor has to say so.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useCancellationPlanForm } from "@/hooks/useCancellationPlanForm";
import type { CancellationTier } from "@/hooks/useCancellationPlanForm";

const tier = (days: number, percentage: string, lessThan: boolean): CancellationTier => ({
  days,
  percentage,
  lessThan,
});

/** Runs validate() on a complete plan and returns the tier-level error, if any. */
function tierErrorFor(tiers: CancellationTier[]): string | null | undefined {
  const { result } = renderHook(() =>
    useCancellationPlanForm({ name: "QA Plan", isActive: true, cancellationTiers: tiers })
  );
  act(() => {
    result.current.validate();
  });
  return result.current.errors.cancellationTiers;
}

describe("useCancellationPlanForm — uncovered boundary days", () => {
  it("flags the day two opposite-direction tiers both exclude", () => {
    // The exact shape #191 describes: the bands look like they meet at 7.
    const error = tierErrorFor([tier(7, "100", false), tier(7, "50", true)]);
    expect(error).toBeTruthy();
    expect(error).toContain("day 7");
  });

  it("flags a wider gap between the two directions", () => {
    // "fewer than 5" covers 0-4, "more than 9" covers 10+. 5 through 9 match
    // nothing at all.
    const error = tierErrorFor([tier(5, "50", true), tier(9, "100", false)]);
    expect(error).toBeTruthy();
    expect(error).toContain("days 5–9");
  });

  it("accepts overlapping bands, which are covered rather than ambiguous", () => {
    // "fewer than 9" covers 0-8 and "more than 5" covers 6+, so every day is
    // matched by something. Overlap is how a multi-band policy is expressed at
    // all — it must not be reported as a gap.
    expect(tierErrorFor([tier(9, "50", true), tier(5, "100", false)])).toBeFalsy();
  });

  it("accepts a realistic three-tier policy with no hole", () => {
    // more than 30 → 100, more than 7 → 50, fewer than 8 → 0.
    // maxLess = 8 so days 0-7 are covered; minMore = 7 so days 8+ are covered.
    const error = tierErrorFor([
      tier(30, "100", false),
      tier(7, "50", false),
      tier(8, "0", true),
    ]);
    expect(error).toBeFalsy();
  });

  it("does not flag a one-sided policy", () => {
    // Only "more than 7" — days 0-7 get nothing, but that is a normal
    // deliberate choice, not the meet-in-the-middle trap, and warning about it
    // would be noise on most real policies.
    expect(tierErrorFor([tier(7, "50", false)])).toBeFalsy();
    expect(tierErrorFor([tier(7, "50", true)])).toBeFalsy();
  });

  it("does not report a gap while a tier is still incomplete", () => {
    // A blank percentage is its own error; a gap computed from a half-typed
    // policy would move around as the operator types.
    const error = tierErrorFor([tier(7, "", false), tier(7, "50", true)]);
    expect(error).toBeFalsy();
  });
});
