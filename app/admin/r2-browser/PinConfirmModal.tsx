"use client";

import { HiLockClosed } from "react-icons/hi";
import { usePinDigits } from "./usePinDigits";

/** Lightweight per-action confirmation — distinct from the full-page PinLockScreen.
 * Unlocking the browser and confirming a single mutation are different moments,
 * so this stays a small dialog over the current screen instead of the full lock page. */
export default function PinConfirmModal({
  message,
  onConfirmed,
  onCancel,
}: {
  message: string;
  onConfirmed: () => void;
  onCancel: () => void;
}) {
  const { digits, verifying, error, shake, inputRefs, handleChange, handleKeyDown, handlePaste } =
    usePinDigits(onConfirmed);

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <style>{`
        @keyframes pin-confirm-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .pin-confirm-shake { animation: pin-confirm-shake 0.4s ease-in-out; }
        @media (prefers-reduced-motion: reduce) {
          .pin-confirm-shake { animation: none; }
        }
      `}</style>
      <div
        className="w-full max-w-xs rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-xl space-y-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20">
          <HiLockClosed className="h-5 w-5 text-white" />
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300">{message}</p>

        <div className={`flex items-center justify-center gap-1.5 ${shake ? "pin-confirm-shake" : ""}`}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={1}
              value={digit}
              disabled={verifying}
              aria-label={`PIN digit ${i + 1} of ${digits.length}`}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  onCancel();
                  return;
                }
                handleKeyDown(i, e);
              }}
              onPaste={handlePaste}
              className={`h-10 w-8 rounded-lg border text-center text-base font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors disabled:opacity-50 ${
                error ? "border-red-300 dark:border-red-800" : "border-gray-300 dark:border-gray-600"
              }`}
            />
          ))}
        </div>

        <div className="h-5" role="status" aria-live="polite">
          {verifying ? (
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <div className="h-3.5 w-3.5 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
              Verifying…
            </div>
          ) : error ? (
            <p className="text-xs font-medium text-red-500">{error}</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={verifying}
          className="text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
