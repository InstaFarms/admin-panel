"use client";

import { useEffect, useState } from "react";

interface UseLocalDraftOptions<T> {
  key: string;
  value: T;
  intervalMs?: number;
}

export function useLocalDraft<T>({ key, value, intervalMs = 7000 }: UseLocalDraftOptions<T>) {
  const [draftRaw, setDraftRaw] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(key);
    setDraftRaw(raw);
    setHasDraft(Boolean(raw));
  }, [key]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setInterval(() => {
      localStorage.setItem(key, JSON.stringify(value));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [key, value, intervalMs]);

  const clearDraft = () => {
    if (typeof window !== "undefined") localStorage.removeItem(key);
    setDraftRaw(null);
    setHasDraft(false);
  };

  const saveNow = () => {
    if (typeof window === "undefined") return;
    const raw = JSON.stringify(value);
    localStorage.setItem(key, raw);
    setDraftRaw(raw);
    setHasDraft(true);
  };

  const hideDraftPrompt = () => setHasDraft(false);

  return {
    draftRaw,
    hasDraft,
    setHasDraft,
    hideDraftPrompt,
    clearDraft,
    saveNow,
  };
}
