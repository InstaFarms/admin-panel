"use client";

import { HiLockClosed } from "react-icons/hi";
import { usePinDigits } from "./usePinDigits";

export default function PinLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { digits, verifying, error, shake, inputRefs, handleChange, handleKeyDown, handlePaste } =
    usePinDigits(onUnlock);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <style>{`
        @keyframes pin-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .pin-shake { animation: pin-shake 0.4s ease-in-out; }
        @media (prefers-reduced-motion: reduce) {
          .pin-shake { animation: none; }
        }
      `}</style>
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 shadow-xl shadow-gray-900/5 dark:shadow-black/20 space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20">
          <HiLockClosed className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">R2 Bucket Browser Locked</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Enter the PIN to continue.</p>
        </div>

        <div className={`flex items-center justify-center gap-2 ${shake ? "pin-shake" : ""}`}>
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
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className={`h-12 w-10 rounded-lg border text-center text-lg font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors disabled:opacity-50 ${
                error
                  ? "border-red-300 dark:border-red-800"
                  : "border-gray-300 dark:border-gray-600"
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
      </div>
    </div>
  );
}
