"use client";

/**
 * Admin sidebar: navigation for /admin routes.
 * - Desktop: collapses to icon-only strip when closed; click group icon to expand and open that group.
 * - Mobile: overlay that slides in/out.
 * Nav structure comes from sidebarNavConfig (SIDEBAR_NAV_SECTIONS).
 */
import { useSidebar } from "@/contexts/SidebarContext";
import { SIDEBAR_NAV_SECTIONS } from "@/components/layout/sidebarNavConfig";
import type { SidebarNavEntry } from "@/components/layout/sidebarNavConfig";
import { findActiveGroupKeys } from "@/utils/sidebar";
import type { MyAdminPermission } from "@/utils/types";
import { CollapsedSidebarContent } from "@/components/sidebar/CollapsedSidebarContent";
import { ExpandedSidebarContent } from "@/components/sidebar/ExpandedSidebarContent";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export interface AdminSidebarProps {
  /** Optional count shown on booking approval queue label. */
  approvalCount?: number;
  /** Optional count shown on Elivaas cancellation requests. */
  elivaasCount?: number;
  permissions?: MyAdminPermission[];
}

const ALL_NAV_ENTRIES: SidebarNavEntry[] = SIDEBAR_NAV_SECTIONS.flatMap(
  (s) => s.entries
);

const WRAPPER_BASE_CLASS = [
  "fixed left-0 z-40 bg-white shadow-lg dark:bg-zinc-900 md:shadow-none",
  "md:border-r md:border-zinc-200 md:dark:border-zinc-800",
  // Stay out of the flex layout on mobile; the responsive md:relative class
  // below deliberately opts the sidebar back into the desktop layout. Having
  // an unscoped `relative` here overrode `fixed`, so the translated-offscreen
  // mobile drawer still reserved its full 16rem width and crushed every page.
  "overflow-hidden",
  "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
].join(" ");

const LAYER_VISIBLE = "opacity-100 pointer-events-auto";
const LAYER_HIDDEN = "opacity-0 pointer-events-none";
const LAYER_TRANSITION = "absolute inset-0 transition-opacity duration-200 ease-out";

function filterNavEntriesByPermissions(
  entries: SidebarNavEntry[],
  allowedPermissionKeys: Set<string>
): SidebarNavEntry[] {
  const filtered: SidebarNavEntry[] = [];
  for (const entry of entries) {
    if (entry.type === "item") {
      if (!entry.item.permissionKey || allowedPermissionKeys.has(entry.item.permissionKey)) {
        filtered.push(entry);
      }
      continue;
    }

    const childEntries = entry.group.items.map((item) =>
      "href" in item ? ({ type: "item", item } as SidebarNavEntry) : ({ type: "group", group: item } as SidebarNavEntry)
    );
    const filteredChildren = filterNavEntriesByPermissions(childEntries, allowedPermissionKeys).map((item) =>
      item.type === "item" ? item.item : item.group
    );
    const groupAllowed =
      !entry.group.permissionKey || allowedPermissionKeys.has(entry.group.permissionKey);
    if (groupAllowed && filteredChildren.length > 0) {
      filtered.push({
        type: "group",
        group: {
          ...entry.group,
          items: filteredChildren,
        },
      });
    }
  }
  return filtered;
}

export default function AdminSidebar({ approvalCount, elivaasCount, permissions }: AdminSidebarProps) {
  const { isOpen, closeSidebar, openSidebar } = useSidebar();
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [openGroupKeys, setOpenGroupKeys] = useState<string[]>([]);
  const pathname = usePathname();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Stagger the nav items in from the left on mount - covers a fresh login and a
  // hard refresh (both fully remount this layout), but not in-app navigation
  // (Sidebar stays mounted across route changes, so clicking around won't
  // replay this - distracting on a persistent nav element you're clicking into).
  useEffect(() => {
    if (!mounted || !wrapperRef.current) return;
    const items = wrapperRef.current.querySelectorAll("li");
    if (!items.length) return;
    import("gsap").then(({ gsap }) => {
      gsap.from(items, { x: -16, opacity: 0, duration: 0.22, stagger: 0.012, ease: "power2.out" });
    });
  }, [mounted]);

  useEffect(() => {
    const activeKeys = findActiveGroupKeys(ALL_NAV_ENTRIES, pathname);
    setOpenGroupKeys(activeKeys);
  }, [pathname]);

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) closeSidebar();
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, [closeSidebar]);

  const handleCloseSidebar = () => {
    if (isMobile) closeSidebar();
  };

  const handleExpandGroup = (groupKey: string) => {
    openSidebar();
    setOpenGroupKeys((prev) =>
      prev.includes(groupKey) ? prev : [...prev, groupKey]
    );
  };

  const isCollapsedDesktop = !isMobile && !isOpen;

  const wrapperClassName = [
    WRAPPER_BASE_CLASS,
    isMobile && "transition-[transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
    isMobile ? (isOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0",
    isMobile
      ? "top-16 h-[calc(100vh-4rem)] w-64"
      : `top-0 h-full ${isOpen ? "md:relative w-64 lg:w-72 xl:w-80" : "md:relative w-16"}`,
  ]
    .filter(Boolean)
    .join(" ");

  const allowedPermissionKeys = new Set(
    (permissions || [])
      .filter((p) => p.canView || p.canEdit)
      .map((p) => p.permissionKey)
  );
  const filteredSections = SIDEBAR_NAV_SECTIONS.map((section) => ({
    ...section,
    entries:
      !permissions
        ? section.entries
        : filterNavEntriesByPermissions(section.entries, allowedPermissionKeys),
  }));

  const sectionsWithApproval = filteredSections.map((section, index) => ({
    ...section,
    approvalCount: index === 0 ? approvalCount : undefined,
    elivaasCount:  index === 0 ? elivaasCount  : undefined,
  })).filter((section) => section.entries.length > 0);

  if (!mounted) {
    return (
      <div className={wrapperClassName}>
        <div
          className="sidebar-scroll h-full min-h-0 w-full overflow-y-auto border-gray-200 dark:border-gray-700"
          aria-label="Admin Sidebar"
        >
          <div className="flex h-full w-64 items-center justify-center p-4 lg:w-72 xl:w-80">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
          onClick={handleCloseSidebar}
          aria-hidden
        />
      )}

      <div ref={wrapperRef} className={wrapperClassName}>
        {isMobile ? (
          <ExpandedSidebarContent
            sections={sectionsWithApproval}
            pathname={pathname}
            onClose={handleCloseSidebar}
            openGroupKeys={openGroupKeys}
            setOpenGroupKeys={setOpenGroupKeys}
          />
        ) : (
          <>
            <div
              className={`${LAYER_TRANSITION} flex flex-col ${isCollapsedDesktop ? LAYER_VISIBLE : LAYER_HIDDEN}`}
              aria-hidden={!isCollapsedDesktop}
            >
              <CollapsedSidebarContent
                sections={filteredSections}
                pathname={pathname}
                onClose={handleCloseSidebar}
                onExpandGroup={handleExpandGroup}
              />
            </div>
            <div
              className={`${LAYER_TRANSITION} ${isCollapsedDesktop ? LAYER_HIDDEN : LAYER_VISIBLE}`}
              aria-hidden={isCollapsedDesktop}
            >
              <ExpandedSidebarContent
                sections={sectionsWithApproval}
                pathname={pathname}
                onClose={handleCloseSidebar}
                openGroupKeys={openGroupKeys}
                setOpenGroupKeys={setOpenGroupKeys}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
