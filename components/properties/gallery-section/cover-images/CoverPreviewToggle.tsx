"use client";

import { Tooltip } from "flowbite-react";
import {
  HiDeviceMobile,
  HiDeviceTablet,
  HiDesktopComputer,
  HiInformationCircle,
} from "react-icons/hi";
import type { SimulatedViewport } from "./constants";

interface CoverPreviewToggleProps {
  showWebsitePreview: boolean;
  onToggle: (showWebsite: boolean) => void;
  activeViewport: SimulatedViewport;
  onViewportPreset: (mode: SimulatedViewport) => void;
  previewWidthPx: number;
  isDragging: boolean;
}

const btnBase =
  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors inline-flex items-center gap-1.5";
const active = "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm";
const inactive =
  "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200";
const viewportBtnBase =
  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors inline-flex items-center gap-1.5";

export default function CoverPreviewToggle({
  showWebsitePreview,
  onToggle,
  activeViewport,
  onViewportPreset,
  previewWidthPx,
  isDragging,
}: CoverPreviewToggleProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Preview:</span>
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 p-0.5">
          <button
            type="button"
            onClick={() => onToggle(true)}
            className={`${btnBase} ${showWebsitePreview ? active : inactive}`}
          >
            As on website
          </button>
          <button
            type="button"
            onClick={() => onToggle(false)}
            className={`${btnBase} ${!showWebsitePreview ? active : inactive}`}
          >
            All Images
          </button>
        </div>
      </div>
      {showWebsitePreview && (
        <div className="flex flex-wrap items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-600">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            Viewport
            <Tooltip
              content={
                <div className="max-w-[300px] text-sm font-normal leading-relaxed text-gray-900 dark:text-gray-100 px-1 py-0.5 space-y-1.5">
                  <p>
                    Preview widths follow the website’s <strong>layout breakpoints</strong>—the
                    pixel widths at which the site switches layout—not actual phone, tablet, or
                    monitor sizes.
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    Don’t get confused: these are content widths used on the site, so you see how
                    the cover images will look at each breakpoint.
                  </p>
                </div>
              }
              style="dark"
              animation="duration-200"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700/80 text-gray-500 dark:text-gray-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200 cursor-help border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800/60">
                <HiInformationCircle className="w-4 h-4 shrink-0" />
              </span>
            </Tooltip>
          </span>
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 p-0.5">
            <button
              type="button"
              title="Mobile (400–750px)"
              onClick={() => onViewportPreset("mobile")}
              className={`${viewportBtnBase} ${activeViewport === "mobile" ? active : inactive}`}
            >
              <HiDeviceMobile className="w-4 h-4" /> Mobile
            </button>
            <button
              type="button"
              title="Tablet (750–900px)"
              onClick={() => onViewportPreset("tablet")}
              className={`${viewportBtnBase} ${activeViewport === "tablet" ? active : inactive}`}
            >
              <HiDeviceTablet className="w-4 h-4" /> Tablet
            </button>
            <button
              type="button"
              title="Laptop (900–1250px)"
              onClick={() => onViewportPreset("laptop")}
              className={`${viewportBtnBase} ${activeViewport === "laptop" ? active : inactive}`}
            >
              <HiDesktopComputer className="w-4 h-4" /> Laptop
            </button>
            <button
              type="button"
              title="Bigger Desktop (1250–1524px)"
              onClick={() => onViewportPreset("biggerDesktop")}
              className={`${viewportBtnBase} ${activeViewport === "biggerDesktop" ? active : inactive}`}
            >
              <HiDesktopComputer className="w-4 h-4" /> Bigger
            </button>
          </div>
          {isDragging ? (
            <span className="text-sm text-gray-400 dark:text-gray-400">
              Drag to resize · {previewWidthPx}px → {activeViewport}
            </span>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-400 tabular-nums">
              {previewWidthPx}px
            </span>
          )}
        </div>
      )}
    </div>
  );
}
