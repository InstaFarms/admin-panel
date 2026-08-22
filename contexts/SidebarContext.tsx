"use client";

/**
 * Sidebar open/close state for the admin shell.
 * Provider syncs with viewport: open on desktop (≥ breakpoint), closed on mobile.
 * Consumed by Sidebar, Navbar, and ContentArea.
 */
import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { SIDEBAR_DESKTOP_BREAKPOINT_PX } from "@/constants/layout";
import { shouldPlayDashboardEntrance } from "@/lib/dashboardEntrance";

interface SidebarContextType {
  isOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  openSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);
const SIDEBAR_DESKTOP_OPEN_STORAGE_KEY = "admin_sidebar_desktop_open";

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasLoadedPreference, setHasLoadedPreference] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDesktop = window.innerWidth >= SIDEBAR_DESKTOP_BREAKPOINT_PX;
    if (!isDesktop) {
      setIsOpen(false);
      setHasLoadedPreference(true);
      return;
    }

    // A fresh login always opens the sidebar, even if a prior session left it
    // collapsed - same one-shot flag that drives the dashboard entrance animation.
    if (shouldPlayDashboardEntrance) {
      setIsOpen(true);
      setHasLoadedPreference(true);
      return;
    }

    const stored = window.localStorage.getItem(SIDEBAR_DESKTOP_OPEN_STORAGE_KEY);
    if (stored === "true") setIsOpen(true);
    else if (stored === "false") setIsOpen(false);
    else setIsOpen(true);

    setHasLoadedPreference(true);
  }, []);

  useEffect(() => {
    const checkScreenSize = () => {
      // Only close when switching to mobile; never force-open on desktop so we
      // don't override user preference when e.g. opening devtools triggers resize.
      if (window.innerWidth < SIDEBAR_DESKTOP_BREAKPOINT_PX) {
        setIsOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasLoadedPreference) return;
    if (window.innerWidth < SIDEBAR_DESKTOP_BREAKPOINT_PX) return;
    window.localStorage.setItem(SIDEBAR_DESKTOP_OPEN_STORAGE_KEY, String(isOpen));
  }, [hasLoadedPreference, isOpen]);

  const toggleSidebar = useCallback(() => setIsOpen((prev) => !prev), []);
  const closeSidebar = useCallback(() => setIsOpen(false), []);
  const openSidebar = useCallback(() => setIsOpen(true), []);

  const value = useMemo(
    () => ({ isOpen, toggleSidebar, closeSidebar, openSidebar }),
    [isOpen, toggleSidebar, closeSidebar, openSidebar]
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

/**
 * Use sidebar state and controls. Must be used within SidebarProvider.
 */
export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

