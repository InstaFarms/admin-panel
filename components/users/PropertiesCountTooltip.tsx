"use client";

import { useState } from "react";
import {
  useFloating,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  offset,
  flip,
  shift,
  autoUpdate,
  safePolygon,
  FloatingPortal,
} from "@floating-ui/react";
import { HiHome } from "react-icons/hi";

interface Property {
  id: string;
  name: string;
  role?: string[];
}

interface PropertiesCountTooltipProps {
  properties: Property[];
  children: React.ReactNode;
}

/**
 * Renders its popup in a portal (via @floating-ui/react) instead of flowbite-react's
 * Tooltip, whose floating content stays in-place in the DOM and gets clipped by the
 * table's overflow-hidden/overflow-x-auto ancestors.
 */
export default function PropertiesCountTooltip({ properties, children }: PropertiesCountTooltipProps) {
  const count = properties?.length ?? 0;
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "top",
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  });

  const hover = useHover(context, { handleClose: safePolygon() });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);

  return (
    <>
      <span
        ref={refs.setReference}
        {...getReferenceProps()}
        className="cursor-help inline-flex items-center justify-center min-w-[1.5rem] font-medium tabular-nums hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
      >
        {children}
      </span>
      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-50 max-w-[280px] rounded-lg border border-gray-200 bg-white px-1 py-0.5 shadow-lg dark:border-gray-600 dark:bg-gray-700"
          >
            <div className="px-1.5 pt-1.5">
              <div className="flex items-center gap-2 pb-2 mb-2 border-b border-gray-200 dark:border-gray-600">
                <HiHome className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-semibold text-gray-900 dark:text-white text-sm">
                  {count === 0 ? "No properties" : `Connected propert${count === 1 ? "y" : "ies"}`}
                </span>
              </div>
              {count > 0 ? (
                <ul className="max-h-44 overflow-y-auto space-y-1.5 pr-1 pb-1.5 text-sm text-gray-700 dark:text-gray-300">
                  {properties.map((p, i) => (
                    <li key={p.id} className="flex items-center gap-2 min-w-0">
                      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                        {i + 1}
                      </span>
                      <span className="flex-1 min-w-0 overflow-hidden break-words line-clamp-2 text-gray-900 dark:text-gray-100">
                        {p.name}
                      </span>
                      {p.role?.length ? (
                        <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                          {p.role.join(", ")}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic pb-1.5">
                  User is not connected to any property
                </p>
              )}
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
