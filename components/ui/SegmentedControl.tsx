"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { slideIndicator } from "@/components/bookings/wizard/gsapHelpers";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Optional leading glyph/icon. */
  icon?: ReactNode;
}

/**
 * Radio-group segmented control with a pill that slides behind the active
 * option (GSAP, via `slideIndicator`; reduced-motion aware there). All options
 * are visible at once - one tap to pick. Set `allowClear` so tapping the active
 * option again deselects it.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  ariaLabel,
  allowClear = false,
}: {
  options: SegmentedOption<T>[];
  value: T | "";
  onChange: (next: T | "") => void;
  disabled?: boolean;
  ariaLabel: string;
  allowClear?: boolean;
}) {
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const didAnimateRef = useRef(false);

  useEffect(() => {
    const activeEl = value ? btnRefs.current[value] : null;
    const indicator = indicatorRef.current;
    if (!indicator) return;

    if (!activeEl) {
      indicator.style.opacity = "0";
      return;
    }
    // Snap on first paint, animate on later changes.
    slideIndicator(indicator, activeEl, didAnimateRef.current);
    didAnimateRef.current = true;
  }, [value]);

  useEffect(() => {
    const onResize = () => {
      const activeEl = value ? btnRefs.current[value] : null;
      if (indicatorRef.current && activeEl) {
        slideIndicator(indicatorRef.current, activeEl, false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [value]);

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="relative flex w-full gap-1.5 rounded-xl border border-slate-300 bg-white p-1.5 shadow-sm dark:border-slate-600 dark:bg-slate-800/80"
    >
      <span
        ref={indicatorRef}
        aria-hidden
        className="pointer-events-none absolute top-1.5 bottom-1.5 left-0 z-0 rounded-lg bg-blue-600 opacity-0 shadow-sm dark:bg-blue-500"
      />
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              btnRefs.current[option.value] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() =>
              onChange(selected && allowClear ? "" : option.value)
            }
            className={[
              "relative z-10 flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              "disabled:cursor-not-allowed disabled:opacity-50",
              selected
                ? "text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
            ].join(" ")}
          >
            {option.icon ? (
              <span aria-hidden className="text-base leading-none">
                {option.icon}
              </span>
            ) : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
