"use client";

import { useEffect, useRef, useState } from "react";
import { verifyR2BrowserPin } from "@/actions/r2BrowserActions";

export const PIN_LENGTH = 6;

/** Shared digit-box entry/verification logic behind both the full-page lock screen
 * and the per-action confirmation modal — same PIN input UX in both places. */
export function usePinDigits(onSuccess: () => void) {
  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const submit = async (pin: string) => {
    setVerifying(true);
    setError(null);
    try {
      const res = await verifyR2BrowserPin(pin);
      if (res.success) {
        onSuccess();
        return;
      }
      setError(res.error || "Incorrect PIN.");
      setShake(true);
      setDigits(Array(PIN_LENGTH).fill(""));
      setTimeout(() => setShake(false), 400);
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const setDigitAt = (index: number, value: string) => {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      if (next.every((d) => d !== "")) void submit(next.join(""));
      return next;
    });
  };

  const handleChange = (index: number, raw: string) => {
    if (verifying) return;
    const value = raw.replace(/\D/g, "").slice(-1);
    if (!value) {
      setDigitAt(index, "");
      return;
    }
    setDigitAt(index, value);
    if (index < PIN_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setDigitAt(index - 1, "");
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, PIN_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(PIN_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    const focusIndex = Math.min(pasted.length, PIN_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
    if (pasted.length === PIN_LENGTH) void submit(pasted);
  };

  return { digits, verifying, error, shake, inputRefs, handleChange, handleKeyDown, handlePaste };
}
