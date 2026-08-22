"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "flowbite-react";
import { X } from "lucide-react";
import CreatePropertyWizard from "./CreatePropertyWizard";

interface BrandOption {
  id: string;
  name: string;
}

interface PropertyTypeOption {
  id: string;
  name: string;
}

interface CreatePropertyDrawerProps {
  open: boolean;
  onClose: () => void;
  brands: BrandOption[];
  propertyTypes: PropertyTypeOption[];
}

const TRANSITION_MS = 320;

export default function CreatePropertyDrawer({
  open,
  onClose,
  brands,
  propertyTypes,
}: CreatePropertyDrawerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  // Slide-in: render at translateX(100%), flip isVisible on next paint
  useEffect(() => {
    if (!open) return;
    setIsVisible(false);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => setIsVisible(true));
    });
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [open]);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsVisible(false);
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, TRANSITION_MS);
  }, [isClosing, onClose]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open && !isClosing) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        aria-label="Close create property drawer"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
        style={{
          opacity: isVisible ? 1 : 0,
          transition: `opacity ${TRANSITION_MS}ms ease`,
        }}
        onClick={handleClose}
      />

      {/* Drawer panel */}
      <div
        className="absolute right-0 top-0 flex h-full w-full max-w-[92vw] flex-col bg-white shadow-2xl dark:bg-gray-900 lg:max-w-[540px]"
        style={{
          transform: isVisible ? "translateX(0)" : "translateX(100%)",
          transition: isVisible
            ? `transform ${TRANSITION_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`
            : `transform ${TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.6, 1)`,
        }}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
                New Property
              </div>
              <h3 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                Add New Property
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Fill in the essentials — add everything else in the editor after creation.
              </p>
            </div>
            <Button color="light" size="xs" onClick={handleClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable wizard body */}
        <div className="flex-1 overflow-y-auto">
          <CreatePropertyWizard
            brands={brands}
            propertyTypes={propertyTypes}
            onClose={handleClose}
          />
        </div>
      </div>
    </div>
  );
}
