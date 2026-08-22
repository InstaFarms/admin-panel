"use client";

/**
 * One-shot "just logged in" signal so the admin shell (topbar, sidebar, content)
 * can play an entrance animation on the very first dashboard render after login,
 * without replaying it on every subsequent client-side navigation.
 *
 * `shouldPlayDashboardEntrance` is read (and the sessionStorage key cleared) once
 * when this module first evaluates on a page load, so every component that imports
 * it agrees on the same value - reading sessionStorage independently in each
 * component's effect would race, since the first reader to clear the key would
 * make the others see it as already consumed.
 */
const FLAG_KEY = "admin-dashboard-entrance";

function readAndClear(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const present = sessionStorage.getItem(FLAG_KEY) === "1";
    if (present) sessionStorage.removeItem(FLAG_KEY);
    return present;
  } catch {
    return false;
  }
}

/** Call right after a successful login, before redirecting to the dashboard. */
export function markDashboardEntrance() {
  try {
    sessionStorage.setItem(FLAG_KEY, "1");
  } catch {
    // sessionStorage can be blocked (private mode etc.) - ignore.
  }
}

export const shouldPlayDashboardEntrance = readAndClear();
