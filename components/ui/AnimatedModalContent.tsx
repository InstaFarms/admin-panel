"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Wraps Flowbite Modal content with a GSAP pop-in entrance. Flowbite's <Modal>
 * fully unmounts on close (no exit transition, no visible/off state to animate),
 * so this mounting fresh IS the open event - a plain mount-triggered entrance
 * replays correctly every time the modal opens.
 */
export function AnimatedModalContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    import("gsap").then(({ gsap }) => {
      if (ref.current) {
        gsap.from(ref.current, { scale: 0.96, opacity: 0, y: 8, duration: 0.25, ease: "power2.out" });
      }
    });
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
