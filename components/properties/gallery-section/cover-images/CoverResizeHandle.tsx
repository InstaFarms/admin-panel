"use client";

import { useCallback, useRef } from "react";

interface CoverResizeHandleProps {
  onResize: (deltaX: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export default function CoverResizeHandle({ onResize, onDragStart, onDragEnd }: CoverResizeHandleProps) {
  const lastX = useRef(0);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      lastX.current = e.clientX;
      onDragStart();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [onDragStart]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.buttons !== 1) return;
      const delta = e.clientX - lastX.current;
      lastX.current = e.clientX;
      onResize(delta);
    },
    [onResize]
  );

  const handlePointerUp = useCallback(() => {
    onDragEnd();
  }, [onDragEnd]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize preview width"
      className="w-2.5 rounded-full flex-shrink-0 cursor-col-resize flex items-center justify-center group bg-gray-300 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="w-1 h-28 rounded-full bg-gray-400 dark:bg-gray-500 group-hover:bg-emerald-500 dark:group-hover:bg-emerald-400 transition-colors" />
    </div>
  );
}
