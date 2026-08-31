import type { RefObject } from "react";
import { gsap } from "gsap";
import { prefersReducedMotion } from "@/lib/motion";

// Thin wrappers around GSAP so every animation in the design mock ("Create
// Booking Wizard.dc.html") degrades to an instant, correct state if GSAP
// hasn't loaded for any reason -- matching the mock's own `if (window.gsap)`
// guards.

type GsapModule = typeof gsap;

export function loadGsap(): Promise<GsapModule> {
  return Promise.resolve(gsap);
}

/** Slide/fade a step panel in, matching `animPanels()` in the design mock. */
export function animatePanelIn(el: HTMLElement | null, direction: 1 | -1 | 0) {
  if (!el) return;
  loadGsap().then((gsap) => {
    const kids = Array.from(el.children) as HTMLElement[];
    if (!kids.length) return;
    gsap.killTweensOf(kids);
    gsap.fromTo(
      kids,
      { opacity: 0, x: direction ? direction * 42 : 0, y: direction ? 0 : 14 },
      { opacity: 1, x: 0, y: 0, duration: 0.5, stagger: 0.06, ease: "power3.out", clearProps: "transform", overwrite: true },
    );
  });
}

/** Reveal a group of cards/rows, matching `staggerCards()` / `[data-anim-stagger]`. */
export function staggerReveal(el: HTMLElement | null) {
  if (!el) return;
  loadGsap().then((gsap) => {
    const kids = Array.from(el.children) as HTMLElement[];
    if (!kids.length) return;
    if (prefersReducedMotion()) {
      gsap.set(kids, { opacity: 1, x: 0, y: 0, scale: 1 });
      return;
    }
    gsap.killTweensOf(kids);
    gsap.fromTo(
      kids,
      { opacity: 0, y: 12, scale: 0.98 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.4,
        stagger: Math.min(0.05, 0.5 / kids.length),
        ease: "power3.out",
        clearProps: "transform",
        overwrite: true,
      },
    );
  });
}

/** Animated count-up/down for a ₹ figure, matching `numRef()`. */
export function countUp(el: HTMLElement | null, value: number, format: (v: number) => string) {
  if (!el) return;
  const prev = Number(el.dataset.ibwVal || 0);
  loadGsap().then((gsap) => {
    gsap.killTweensOf(el);
    const proxy = { v: prev };
    gsap.to(proxy, {
      v: value,
      duration: 0.55,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = format(proxy.v);
      },
      onComplete: () => {
        el.dataset.ibwVal = String(value);
      },
    });
  });
  el.dataset.ibwVal = el.dataset.ibwVal ?? String(value);
}

/** Flash a value span when it changes, matching `flashRef()`. */
export function flashValue(el: HTMLElement | null) {
  if (!el || prefersReducedMotion()) return;
  loadGsap().then((gsap) => {
    gsap.fromTo(
      el,
      { scale: 1.18, color: "var(--acc)" },
      { scale: 1, color: "", duration: 0.5, ease: "power2.out", clearProps: "color,transform" },
    );
  });
}

/** Success checkmark pop, matching the step-10 `checkRef` animation. */
export function popCheck(el: HTMLElement | null) {
  if (!el) return;
  loadGsap().then((gsap) => {
    if (prefersReducedMotion()) {
      gsap.set(el, { scale: 1, rotate: 0 });
      return;
    }
    gsap.fromTo(el, { scale: 0, rotate: -30 }, { scale: 1, rotate: 0, duration: 0.7, ease: "back.out(1.7)" });
  });
}

/** Toast slide-up entrance. */
export function slideUpToast(el: HTMLElement | null) {
  if (!el) return;
  loadGsap().then((gsap) => {
    gsap.fromTo(el, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" });
  });
}

/** New payment row reveal, matching the `.pay-card` add-row animation. */
export function revealNewRow(el: HTMLElement | null) {
  if (!el) return;
  loadGsap().then((gsap) => {
    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 1, y: 0, height: "auto", marginBottom: 0 });
      return;
    }
    gsap.fromTo(
      el,
      { opacity: 0, y: -8, height: 0, marginBottom: -12 },
      { opacity: 1, y: 0, height: "auto", marginBottom: 0, duration: 0.4, ease: "power3.out", clearProps: "all" },
    );
  });
}

/** Bouncy pop + pulsing ring, used for the Step 7 "Auto" reset button. */
export function popWithRing(el: HTMLElement | null) {
  if (!el || (el as any).__ibwPopped) return;
  (el as any).__ibwPopped = true;
  loadGsap().then((gsap) => {
    gsap
      .timeline()
      .fromTo(el, { scale: 0.4, opacity: 0, y: 4 }, { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: "back.out(2.2)" })
      .fromTo(
        el,
        { boxShadow: "0 0 0 0 rgba(37,99,235,.45)" },
        { boxShadow: "0 0 0 7px rgba(37,99,235,0)", duration: 1.1, ease: "sine.out", repeat: 2 },
        "+=0.1",
      );
  });
}

/** Spin the reset icon in, used alongside `popWithRing`. */
export function spinIn(el: HTMLElement | null) {
  if (!el || (el as any).__ibwSpun) return;
  (el as any).__ibwSpun = true;
  loadGsap().then((gsap) => {
    gsap.fromTo(el, { rotate: 0 }, { rotate: -360, duration: 0.7, ease: "power2.out", delay: 0.15 });
  });
}

/** Animate a donut/conic-gradient sweep for payment progress. */
export function animateDonut(
  el: HTMLElement | null,
  pct: number,
  colorVar = "var(--acc)",
  trackVar = "var(--line)",
) {
  if (!el) return;
  const prev = Number(el.dataset.ibwPct || 0);
  loadGsap().then((gsap) => {
    gsap.killTweensOf(el);
    const proxy = { v: prev };
    gsap.to(proxy, {
      v: pct,
      duration: 0.6,
      ease: "power2.out",
      onUpdate: () => {
        el.style.background = `conic-gradient(${colorVar} ${proxy.v * 3.6}deg, ${trackVar} 0deg)`;
      },
      onComplete: () => {
        el.dataset.ibwPct = String(pct);
      },
    });
  });
}

/** Animate a step-progress connecting line filling in. */
export function fillLine(el: HTMLElement | null, filled: boolean) {
  if (!el) return;
  loadGsap().then((gsap) => {
    gsap.to(el, { scaleX: filled ? 1 : 0, duration: 0.5, ease: "power2.out" });
  });
}

/** Bouncy pop for a step-bar circle when it flips from "current/upcoming" to "done". */
export function popCircle(el: HTMLElement | null, done: boolean) {
  if (!el) return;
  const was = (el as any).__ibwDone;
  (el as any).__ibwDone = done;
  if (!done || was === true) return;
  loadGsap().then((gsap) => {
    gsap.fromTo(el, { scale: 0.72 }, { scale: 1, duration: 0.5, ease: "back.out(2.6)", clearProps: "transform" });
  });
}

/**
 * Stateful step-progress line filler matching the design mock's `lineRef`:
 * animates from the line's previous fill state, flips fill direction
 * (left-to-right filling in, right-to-left draining), and staggers
 * simultaneous line fills (e.g. multiple steps completing via a jump) by
 * 60ms each within the same tick.
 */
export function createLineFiller() {
  let lastBatchAt = 0;
  let n = 0;
  return (el: HTMLElement | null, filled: boolean) => {
    if (!el) return;
    const want = filled ? 1 : 0;
    const prev = typeof (el as any).__ibwFill === "number" ? (el as any).__ibwFill : want;
    (el as any).__ibwFill = want;
    loadGsap().then((gsap) => {
      if (prev === want) {
        gsap.set(el, { scaleX: want });
        return;
      }
      const now = performance.now();
      if (now - lastBatchAt > 60) {
        lastBatchAt = now;
        n = 0;
      }
      const delay = 0.06 * n++;
      gsap.fromTo(
        el,
        { scaleX: prev, transformOrigin: want ? "left center" : "right center" },
        { scaleX: want, duration: 0.45, delay, ease: "power2.out" },
      );
    });
  };
}

/** Slide a background pill/indicator behind the active item in a segmented control. */
export function slideIndicator(indEl: HTMLElement | null, targetEl: HTMLElement | null, animate = true, backgroundColor?: string) {
  if (!indEl || !targetEl || !targetEl.offsetWidth) return;
  loadGsap().then((gsap) => {
    gsap.to(indEl, {
      left: targetEl.offsetLeft,
      width: targetEl.offsetWidth,
      opacity: 1,
      ...(backgroundColor ? { backgroundColor } : {}),
      duration: animate && !prefersReducedMotion() ? 0.38 : 0,
      ease: "power3.out",
    });
  });
}

export type { RefObject };
