"use client";

import { useEffect, useRef } from "react";
import {
  appTheme,
  appToastErrorTheme,
  appToastErrorStyle,
  appToastLoadingStyle,
  appToastLoadingTheme,
  appToastSuccessStyle,
  appToastSuccessTheme,
} from "@/utils/themes";
import { Toaster, ToastIcon, resolveValue, type Toast } from "react-hot-toast";

/**
 * Fully replaces react-hot-toast's default ToastBar (which bakes its own CSS
 * enter/exit animation into its root element regardless of custom children)
 * with a bare bubble we drive with GSAP - a springy pop-in on arrival, a quick
 * fade+slide out on dismiss. Icon and theme colors (from utils/themes) are
 * preserved via ToastIcon and toast.style; only the animation mechanism changes.
 */
function AnimatedToast({ t }: { t: Toast }) {
  const ref = useRef<HTMLDivElement>(null);
  const wasVisible = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    import("gsap").then(({ gsap }) => {
      if (!ref.current) return;
      if (t.visible && !wasVisible.current) {
        gsap.fromTo(
          ref.current,
          { x: 60, opacity: 0, scale: 0.9 },
          { x: 0, opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.6)" }
        );
      } else if (!t.visible && wasVisible.current) {
        gsap.to(ref.current, { x: 60, opacity: 0, scale: 0.92, duration: 0.25, ease: "power2.in" });
      }
      wasVisible.current = t.visible;
    });
  }, [t.visible]);

  return (
    <div
      ref={ref}
      className="flex items-center gap-3 px-4 py-3 text-sm"
      style={t.style}
      {...t.ariaProps}
    >
      <ToastIcon toast={t} />
      <div>{resolveValue(t.message, t)}</div>
    </div>
  );
}

export const AppToaster = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: appTheme,
        success: {
          style: appToastSuccessStyle,
          iconTheme: appToastSuccessTheme,
        },
        error: {
          style: appToastErrorStyle,
          iconTheme: appToastErrorTheme,
        },
        loading: {
          style: appToastLoadingStyle,
          iconTheme: appToastLoadingTheme,
        },
      }}
    >
      {(t) => <AnimatedToast t={t} />}
    </Toaster>
  );
};
