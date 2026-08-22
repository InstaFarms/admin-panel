/**
 * Lazily loads GSAP + the Flip plugin once and caches the result, so callers
 * can synchronously check `getFlip()` before triggering a state update (Flip
 * needs to measure DOM positions *before* the change happens - an async
 * import at that exact moment would be too late).
 */
import type { gsap as gsapType } from "gsap";
import type { Flip as FlipType } from "gsap/Flip";

let cached: { gsap: typeof gsapType; Flip: typeof FlipType } | null = null;
let loading: Promise<void> | null = null;

export function preloadFlip(): void {
  if (cached || loading) return;
  loading = Promise.all([import("gsap"), import("gsap/Flip")]).then(([gsapMod, flipMod]) => {
    gsapMod.gsap.registerPlugin(flipMod.Flip);
    cached = { gsap: gsapMod.gsap, Flip: flipMod.Flip };
  });
}

export function getFlip() {
  return cached;
}
