"use client";

import { useEffect, useRef } from "react";
import { countUp, staggerReveal } from "./gsapHelpers";

/** GSAP-animated ₹ count-up span -- used for pricing/summary totals. */
export function CountUpValue({
  value,
  format,
  className,
  style,
}: {
  value: number;
  format: (v: number) => string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    countUp(ref.current, value, format);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span ref={ref} className={className} style={style} />;
}

/** Wraps a stagger-reveal group ("data-anim-stagger" in the design mock). */
export function StaggerGroup({
  children,
  className,
  style,
  triggerKey,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  triggerKey?: string | number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    staggerReveal(ref.current);
    // Deliberately keyed on triggerKey only -- `children` is a new object on
    // every render (JSX creates a fresh tree each pass), so including it here
    // would replay the reveal animation on every parent re-render (e.g. every
    // calendar date click), not just when the group's contents actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerKey]);
  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="ibw-card p-9 text-center text-[13.5px]" style={{ color: "var(--mut)" }}>
      <div
        className="ibw-spin mx-auto mb-2.5 h-6 w-6 rounded-full"
        style={{ border: "3px solid var(--line)", borderTopColor: "var(--acc)" }}
      />
      {label}
    </div>
  );
}
