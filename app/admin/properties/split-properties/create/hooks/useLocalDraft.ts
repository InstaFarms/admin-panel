"use client";

import { useEffect, useRef, useState } from "react";

export interface StoredDraft<T> {
  savedAt: number;
  value: T;
}

interface UseLocalDraftOptions<T> {
  key: string;
  value: T;
  intervalMs?: number;
  /**
   * Auto-save stays off until this is true. Without it, merely opening the
   * wizard writes an empty draft every 7s, and the next visit offers to
   * "restore" nothing.
   */
  enabled?: boolean;
}

export function useLocalDraft<T>({ key, value, intervalMs = 7000, enabled = true }: UseLocalDraftOptions<T>) {
  const [draft, setDraft] = useState<StoredDraft<T> | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  // The autosave interval reads the newest state through this ref rather than
  // depending on it. Depending on `value` would tear down and restart the
  // timer on every keystroke, so it would never actually reach intervalMs.
  const latest = useRef({ value, enabled });
  latest.current = { value, enabled };

  const write = (): StoredDraft<T> => {
    const payload: StoredDraft<T> = { savedAt: Date.now(), value: latest.current.value };
    localStorage.setItem(key, JSON.stringify(payload));
    return payload;
  };

  // Read once on mount. `hasDraft` is deliberately only set here: it drives the
  // restore prompt, which must not pop back up every time we autosave.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? (JSON.parse(raw) as StoredDraft<T>) : null;
      setDraft(parsed);
      setHasDraft(Boolean(parsed));
    } catch {
      localStorage.removeItem(key); // unreadable leftover — never offer it
    }
  }, [key]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setInterval(() => {
      if (latest.current.enabled) write();
    }, intervalMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, intervalMs]);

  const clearDraft = () => {
    if (typeof window !== "undefined") localStorage.removeItem(key);
    setDraft(null);
    setHasDraft(false);
  };

  /** Hide the restore prompt without throwing away the stored draft. */
  const dismissPrompt = () => setHasDraft(false);

  const saveNow = () => {
    if (typeof window === "undefined") return;
    setDraft(write());
  };

  return { draft, hasDraft, dismissPrompt, clearDraft, saveNow };
}
