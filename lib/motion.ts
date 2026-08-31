"use client";

import { gsap } from "gsap";

/**
 * Small shared motion helpers. The rest of the app animates with GSAP (lazy or
 * direct import); this module adds the one thing the codebase was missing - a
 * single `prefers-reduced-motion` check that every new animation can call so it
 * degrades to an instant, correct final state instead of skipping and leaving
 * an element stuck at `opacity: 0`.
 */

/** Sync, SSR-safe. `true` when the OS/browser asks for reduced motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Quick horizontal shake, e.g. on a submit button when validation fails.
 * No-op under reduced motion.
 */
export function shake(el: HTMLElement | null): void {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(
    el,
    { x: -8 },
    { x: 0, duration: 0.5, ease: "elastic.out(1,0.45)", clearProps: "x" },
  );
}

/**
 * Subtle one-shot focus-ring pulse - acknowledges that a field's value just
 * changed programmatically, without moving anything. No-op under reduced motion.
 */
export function pulseRing(el: HTMLElement | null): void {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(
    el,
    { boxShadow: "0 0 0 3px rgba(59,130,246,0.35)" },
    {
      boxShadow: "0 0 0 0px rgba(59,130,246,0)",
      duration: 0.55,
      ease: "power2.out",
      clearProps: "boxShadow",
    },
  );
}
