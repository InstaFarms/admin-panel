"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface FullSizeImageModalProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export default function FullSizeImageModal({ src, alt, onClose }: FullSizeImageModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    import("gsap").then(({ gsap }) => {
      if (cancelled || !overlayRef.current || !frameRef.current) return;
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" });
      gsap.fromTo(
        frameRef.current,
        { scale: 0.92, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.28, ease: "back.out(1.6)" }
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Plays the exit animation before actually calling onClose, so this doesn't
  // just vanish - all close triggers (backdrop, X button) route through here.
  const handleClose = () => {
    import("gsap").then(({ gsap }) => {
      if (!overlayRef.current || !frameRef.current) {
        onClose();
        return;
      }
      gsap.to(frameRef.current, { scale: 0.92, opacity: 0, duration: 0.18, ease: "power2.in" });
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.18,
        ease: "power2.in",
        onComplete: onClose,
      });
    });
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Full size image"
    >
      <div
        ref={frameRef}
        className="relative inline-block max-w-full max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl block"
        />
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>,
    document.body
  );
}
