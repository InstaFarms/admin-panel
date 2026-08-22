"use client";

import { Fragment } from "react";
import type {
  SidebarNavEntry,
  SidebarNavGroup,
  SidebarNavItem,
  SidebarNavItemWithCustomLabel,
} from "@/components/layout/sidebarNavConfig";
import {
  SIDEBAR_ACTIVE_CLASS,
  SIDEBAR_COLLAPSED_ICON_CLASS,
} from "@/constants/sidebar";
import { hasActiveInGroup, isActive } from "@/utils/sidebar";
import Link from "next/link";

interface CollapsedItemIconProps {
  item: SidebarNavItem | SidebarNavItemWithCustomLabel;
  pathname: string;
  onClose: () => void;
}

function CollapsedItemIcon({ item, pathname, onClose }: CollapsedItemIconProps) {
  const active = isActive(pathname, item.href, item.activeMatch);
  const label =
    "customLabel" in item && item.customLabel ? String(item.label) : item.label;
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClose}
      title={label}
      className={`${SIDEBAR_COLLAPSED_ICON_CLASS} ${active ? SIDEBAR_ACTIVE_CLASS : ""}`}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-5 w-5" />
    </Link>
  );
}

interface CollapsedGroupIconProps {
  group: SidebarNavGroup;
  groupKey: string;
  pathname: string;
  onExpandGroup: (groupKey: string) => void;
}

function CollapsedGroupIcon({
  group,
  groupKey,
  pathname,
  onExpandGroup,
}: CollapsedGroupIconProps) {
  const Icon = group.icon;
  const groupLabel = typeof group.label === "string" ? group.label : "Group";
  const hasActiveChild = hasActiveInGroup(group.items, pathname);
  return (
    <button
      type="button"
      title={groupLabel}
      className={`${SIDEBAR_COLLAPSED_ICON_CLASS} ${hasActiveChild ? SIDEBAR_ACTIVE_CLASS : ""}`}
      aria-label={`Open ${groupLabel}`}
      aria-current={hasActiveChild ? "true" : undefined}
      onClick={() => onExpandGroup(groupKey)}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

interface CollapsedNavEntriesProps {
  entries: SidebarNavEntry[];
  pathname: string;
  onClose: () => void;
  onExpandGroup: (groupKey: string) => void;
}

function CollapsedNavEntries({
  entries,
  pathname,
  onClose,
  onExpandGroup,
}: CollapsedNavEntriesProps) {
  return (
    <div className="flex flex-col gap-1 py-2">
      {entries.map((entry) =>
        entry.type === "item" ? (
          <CollapsedItemIcon
            key={entry.item.href}
            item={entry.item}
            pathname={pathname}
            onClose={onClose}
          />
        ) : (
          <CollapsedGroupIcon
            key={entry.group.label}
            group={entry.group}
            groupKey={entry.group.label}
            pathname={pathname}
            onExpandGroup={onExpandGroup}
          />
        )
      )}
    </div>
  );
}

const SECTION_DIVIDER_CLASS = "my-1 border-t border-zinc-200 dark:border-zinc-700";

export interface CollapsedSidebarContentProps {
  sections: { entries: SidebarNavEntry[] }[];
  pathname: string;
  onClose: () => void;
  onExpandGroup: (groupKey: string) => void;
}

export function CollapsedSidebarContent({
  sections,
  pathname,
  onClose,
  onExpandGroup,
}: CollapsedSidebarContentProps) {
  return (
    <div className="sidebar-scroll sidebar-scroll-collapsed flex h-full min-h-0 flex-col overflow-y-auto border-zinc-200 dark:border-zinc-700">
      <div className="flex flex-1 flex-col gap-2 px-2 pt-2">
        {sections.map((section, index) => (
          <Fragment key={index}>
            {index > 0 && <div className={SECTION_DIVIDER_CLASS} />}
            <CollapsedNavEntries
              entries={section.entries}
              pathname={pathname}
              onClose={onClose}
              onExpandGroup={onExpandGroup}
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
}
