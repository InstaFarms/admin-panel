"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { preloadFlip, getFlip } from "@/lib/gsapFlip";

/**
 * Smooths a list's reflow when items are added/removed outside of a drag
 * gesture (dnd-kit's useSortable already animates the live drag itself, but a
 * delete/add button click just snaps siblings into their new position with no
 * transition). Returns `capture()` - call it synchronously right before the
 * state update that will add/remove an item; once React commits the new
 * list, the remaining rows Flip from their old position to the new one, and
 * a freshly-added row fades in instead of just appearing.
 */
export function useFlipListTransition<T>(
  containerRef: RefObject<HTMLElement | null>,
  items: T[],
  rowSelector = "tr"
) {
  const pending = useRef<unknown>(null);

  useLayoutEffect(() => {
    preloadFlip();
  }, []);

  const capture = () => {
    const flip = getFlip();
    if (flip && containerRef.current) {
      pending.current = flip.Flip.getState(containerRef.current.querySelectorAll(rowSelector));
    }
  };

  useLayoutEffect(() => {
    const flip = getFlip();
    if (!pending.current || !flip) return;
    const state = pending.current;
    pending.current = null;
    flip.Flip.from(state as Parameters<typeof flip.Flip.from>[0], {
      duration: 0.35,
      ease: "power2.out",
      absolute: true,
      onEnter: (elements: Element[]) =>
        flip.gsap.fromTo(elements, { opacity: 0 }, { opacity: 1, duration: 0.3 }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  return capture;
}
