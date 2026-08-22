"use client";

import { useEffect, useRef, useState } from "react";

export interface AnimatedNumberProps {
  /** Target numeric value to count up (or down) to. */
  value: number;
  /** Formats the in-progress tweened value for display. Defaults to a rounded integer. */
  format?: (n: number) => string;
  /** Tween duration in seconds. */
  duration?: number;
  className?: string;
}

/**
 * Counts from the previous value up (or down) to `value` whenever it changes -
 * not just on mount, so switching dashboard filters re-triggers the count too.
 */
export function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  duration = 0.8,
  className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(() => format(0));
  const prevValueRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const tweenTarget = { value: prevValueRef.current };

    import("gsap").then(({ gsap }) => {
      if (cancelled) return;
      gsap.to(tweenTarget, {
        value,
        duration,
        ease: "power2.out",
        onUpdate: () => setDisplay(format(tweenTarget.value)),
        onComplete: () => {
          prevValueRef.current = value;
        },
      });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <span className={className}>{display}</span>;
}
