"use client";

import { useSidebar } from "@/contexts/SidebarContext";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";

/**
 * Most pages wrap everything in one outer div containing a single Card (and
 * Flowbite's Card itself wraps its content in one more inner div) - stopping
 * one level deep there just finds that single wrapper and animates the whole
 * page as one block, unlike the dashboard's multiple top-level sections which
 * stagger nicely. Keep descending while a level has exactly one child until
 * we reach the level that actually has multiple sections to stagger.
 */
function findStaggerTargets(container: Element, maxDepth = 4): Element[] {
  let level = Array.from(container.children);
  let depth = 0;
  while (level.length === 1 && depth < maxDepth) {
    const next = Array.from(level[0].children);
    if (next.length === 0) break;
    level = next;
    depth += 1;
  }
  return level;
}

export default function ContentArea({ children }: { children: ReactNode }) {
  const { isOpen } = useSidebar();
  const contentRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Fade + slide the page's sections in on every page landed on (fresh load,
  // refresh, or in-app navigation) - re-runs whenever the route changes.
  // Gated on `mounted` (flips true on the render tick after hydration) so this
  // never mutates styles while React is still verifying the hydrated tree -
  // doing so otherwise races with hydration and throws false-positive
  // hydration-mismatch warnings for the translate/rotate/scale/opacity styles
  // GSAP writes.
  useEffect(() => {
    if (!mounted || !contentRef.current) return;
    const items = findStaggerTargets(contentRef.current);
    if (!items.length) return;
    import("gsap").then(({ gsap }) => {
      gsap.from(items, {
        y: 26,
        opacity: 0,
        duration: 0.45,
        stagger: 0.12,
        ease: "power3.out",
        // Pages with an async server-side data fetch (e.g. a brand list
        // loaded before render) can still be mid-hydration for a nested
        // segment when this fires, racing GSAP's inline styles against
        // React patching that same node. clearProps wipes the transform/
        // opacity styles once the tween ends so no permanent inline style
        // is left behind to conflict with a later React update.
        clearProps: "opacity,transform,translate,rotate,scale",
      });
    });
  }, [mounted, pathname]);

  return (
    <div
      ref={contentRef}
      className={`
        admin-content-area
        flex-1
        overflow-x-auto
        overflow-y-auto
        bg-[#f3f6fb]
        dark:bg-[#111722]
        transition-all
        duration-300
        ease-in-out
        p-4
      `}
    >
        {children}
    </div>
  );
}

