/**
 * Debounce utilities for delaying execution until after a quiet period.
 * Use for search inputs, resize handlers, and other high-frequency events.
 */
import { useRef } from "react";

/**
 * Returns a function that invokes `fn` only after `delayMs` have passed
 * since the last call. Each new call resets the timer.
 *
 * @param fn - Callback to run after the delay.
 * @param delayMs - Delay in milliseconds.
 * @returns Debounced function. Call `cancel()` on it to clear a pending run.
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delayMs: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn(...args);
    }, delayMs);
  };

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * React hook: returns a stable debounced function that calls the latest `callback`
 * after `delayMs` of inactivity. Safe to use in event handlers (e.g. input onChange).
 *
 * @param callback - Function to call after the delay (can change each render).
 * @param delayMs - Delay in milliseconds.
 * @returns Debounced function with the same signature as callback, plus `.cancel()`.
 */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delayMs: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  const callbackRef = useRef(callback);
  const debouncedRef = useRef<ReturnType<typeof debounce<T>> | null>(null);

  callbackRef.current = callback;

  if (debouncedRef.current === null) {
    debouncedRef.current = debounce((...args: Parameters<T>) => {
      callbackRef.current(...args);
    }, delayMs);
  }

  return debouncedRef.current;
}
