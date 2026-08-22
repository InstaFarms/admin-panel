"use client";

interface DropZoneProps {
  isDragging: boolean;
  isProcessing: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

export default function DropZone({
  isDragging,
  isProcessing,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileInput,
  inputRef,
}: DropZoneProps) {
  const borderClass = isDragging
    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 scale-[1.01]"
    : "border-gray-300 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/50 hover:border-gray-400 dark:hover:border-gray-500";

  const handleClick = () => inputRef.current?.click();

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      onClick={handleClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer ${borderClass}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,image/webp,.webp,.zip,application/zip,application/x-zip-compressed"
        onChange={onFileInput}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
      <div className="relative flex flex-col items-center justify-center py-12 px-6 pointer-events-none">
        {isProcessing ? (
          <>
            <div className="w-14 h-14 rounded-full border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-500 dark:border-t-emerald-400 animate-spin mb-4" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Processing…</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-emerald-600 dark:text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-1">
              Drop images or a ZIP file
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
              Drag and drop a folder of images, multiple files, or a .zip archive here — or click to
              browse.
            </p>
            <p className="mt-6 flex items-center justify-center gap-3 text-sm sm:text-base text-green-600 dark:text-green-400">
              <span className="font-semibold">Note:</span>
              <span className="italic">Recommended ratio is horizontal</span>
              <span className="inline-flex items-center rounded-md px-2.5 py-1 font-mono text-base font-bold tabular-nums text-green-700 dark:text-green-300 ring-2 ring-red-300 dark:ring-green-500/60 bg-red-50 dark:bg-green-900/20">
                4∶3
              </span>
              <span className="italic">Ratio.</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
