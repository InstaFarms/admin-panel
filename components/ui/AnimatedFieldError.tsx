"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Field-level validation error text that slides + fades in instead of popping.
 * Enter-only (Flowbite/React unmounts the node the instant the error clears, so
 * there is no element left to animate out). Reduced-motion aware. Wraps the
 * `revealNewRow` shape from `components/bookings/wizard/gsapHelpers.ts`.
 */
export function AnimatedFieldError({
  children,
  className = "text-sm text-red-600",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const message = typeof children === "string" ? children : "";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 1, y: 0, height: "auto" });
      return;
    }
    gsap.fromTo(
      el,
      { opacity: 0, y: -4, height: 0 },
      {
        opacity: 1,
        y: 0,
        height: "auto",
        duration: 0.28,
        ease: "power3.out",
        clearProps: "all",
        overwrite: true,
      },
    );
  }, [message]);

  return (
    <p ref={ref} role="alert" className={className}>
      {children}
    </p>
  );
}
