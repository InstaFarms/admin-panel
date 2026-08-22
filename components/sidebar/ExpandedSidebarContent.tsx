"use client";

import type {
  SidebarNavEntry,
  SidebarNavGroup,
  SidebarNavGroupChild,
  SidebarNavItem,
  SidebarNavItemWithCustomLabel,
} from "@/components/layout/sidebarNavConfig";
import { SIDEBAR_EXPANDED_ACTIVE_CLASS } from "@/constants/sidebar";
import { hasActiveInGroup, isActive, isGroupChild } from "@/utils/sidebar";
import { Sidebar, SidebarItem, SidebarItemGroup, SidebarItems } from "flowbite-react";
import Link from "next/link";
import { HiChevronDown } from "react-icons/hi";

interface NavLinkProps {
  item: SidebarNavItem | SidebarNavItemWithCustomLabel;
  pathname: string;
  onClose: () => void;
  approvalCount?: number;
  elivaasCount?: number;
}

function NavLink({ item, pathname, onClose, approvalCount, elivaasCount }: NavLinkProps) {
  const active = isActive(pathname, item.href, item.activeMatch);
  const label =
    "customLabel" in item && item.customLabel
      ? item.customLabel(approvalCount, elivaasCount)
      : item.label;

  return (
    <SidebarItem
      href={item.href}
      icon={item.icon}
      onClick={onClose}
      as={Link}
      active={active}
      className={active ? SIDEBAR_EXPANDED_ACTIVE_CLASS : undefined}
    >
      {label}
    </SidebarItem>
  );
}

interface NavGroupProps {
  group: SidebarNavGroup;
  groupKey: string;
  depth: number;
  pathname: string;
  onClose: () => void;
  approvalCount?: number;
  elivaasCount?: number;
  openGroupKeys: string[];
  setOpenGroupKeys: React.Dispatch<React.SetStateAction<string[]>>;
}

function NavGroup({
  group,
  groupKey,
  depth,
  pathname,
  onClose,
  approvalCount,
  elivaasCount,
  openGroupKeys,
  setOpenGroupKeys,
}: NavGroupProps) {
  const label = group.customLabel ? group.customLabel(approvalCount, elivaasCount) : group.label;
  const Icon = group.icon;
  const hasActiveChild = hasActiveInGroup(group.items, pathname);
  const isOpen = openGroupKeys.includes(groupKey);
  const contentPaddingClass = "pl-6";

  const toggleGroup = () => {
    setOpenGroupKeys((prev) =>
      prev.includes(groupKey)
        ? prev.filter((key) => key !== groupKey)
        : [...prev, groupKey]
    );
  };

  return (
    <li className="sidebar-collapse-group">
      <button
        type="button"
        onClick={toggleGroup}
        title={typeof label === "string" ? label : undefined}
        className={`sidebar-collapse-trigger group flex w-full items-center rounded-lg px-2 text-base font-normal ${
          hasActiveChild
            ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 dark:text-white"
            : "text-zinc-900 hover:bg-zinc-100 dark:text-white dark:hover:bg-zinc-700"
        }`}
        aria-expanded={isOpen}
      >
        <span
          className={`flex w-10 shrink-0 items-center justify-center rounded-lg p-2 ${
            hasActiveChild
              ? "text-white/90 group-hover:text-white"
              : "text-zinc-500 group-hover:bg-zinc-100 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:bg-zinc-700 dark:group-hover:text-white"
          }`}
        >
          <Icon className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1 whitespace-nowrap px-3 text-left">{label}</span>
        <HiChevronDown
          className={`h-5 w-5 shrink-0 transition-transform duration-200 ease-out ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
      <div
        className={`sidebar-collapse-content overflow-hidden transition-all duration-300 ease-in-out ${contentPaddingClass}`}
        style={{ maxHeight: isOpen ? "50rem" : 0 }}
      >
        <ul className="space-y-2 py-1" role="list">
          {renderGroupChildren(
            group.items,
            pathname,
            onClose,
            approvalCount,
            elivaasCount,
            openGroupKeys,
            setOpenGroupKeys,
            groupKey,
            depth + 1
          )}
        </ul>
      </div>
    </li>
  );
}

function renderGroupChildren(
  items: SidebarNavGroupChild[],
  pathname: string,
  onClose: () => void,
  approvalCount: number | undefined,
  elivaasCount: number | undefined,
  openGroupKeys: string[],
  setOpenGroupKeys: React.Dispatch<React.SetStateAction<string[]>>,
  parentGroupKey: string,
  depth: number
) {
  return items.map((child) => {
    if (isGroupChild(child)) {
      const childKey = `${parentGroupKey}/${child.label}`;
      return (
        <NavGroup
          key={childKey}
          group={child}
          groupKey={childKey}
          depth={depth}
          pathname={pathname}
          onClose={onClose}
          approvalCount={approvalCount}
          elivaasCount={elivaasCount}
          openGroupKeys={openGroupKeys}
          setOpenGroupKeys={setOpenGroupKeys}
        />
      );
    }

    return (
      <NavLink
        key={child.href}
        item={child}
        pathname={pathname}
        onClose={onClose}
        approvalCount={approvalCount}
        elivaasCount={elivaasCount}
      />
    );
  });
}

function renderNavEntries(
  entries: SidebarNavEntry[],
  pathname: string,
  onClose: () => void,
  approvalCount: number | undefined,
  elivaasCount: number | undefined,
  openGroupKeys: string[],
  setOpenGroupKeys: React.Dispatch<React.SetStateAction<string[]>>
) {
  return entries.map((entry) => {
    if (entry.type === "item") {
      return (
        <NavLink
          key={entry.item.href}
          item={entry.item}
          pathname={pathname}
          onClose={onClose}
          approvalCount={approvalCount}
          elivaasCount={elivaasCount}
        />
      );
    }
    const groupLabel = entry.group.label;
    return (
      <NavGroup
        key={groupLabel}
        group={entry.group}
        groupKey={groupLabel}
        depth={0}
        pathname={pathname}
        onClose={onClose}
        approvalCount={approvalCount}
        elivaasCount={elivaasCount}
        openGroupKeys={openGroupKeys}
        setOpenGroupKeys={setOpenGroupKeys}
      />
    );
  });
}

export interface ExpandedSidebarContentProps {
  sections: { entries: SidebarNavEntry[]; approvalCount?: number; elivaasCount?: number }[];
  pathname: string;
  onClose: () => void;
  openGroupKeys: string[];
  setOpenGroupKeys: React.Dispatch<React.SetStateAction<string[]>>;
}

export function ExpandedSidebarContent({
  sections,
  pathname,
  onClose,
  openGroupKeys,
  setOpenGroupKeys,
}: ExpandedSidebarContentProps) {
  return (
    <div className="sidebar-scroll h-full min-h-0 overflow-y-auto border-zinc-200 dark:border-zinc-700">
      <Sidebar
        aria-label="Admin Sidebar"
        className="m-0 min-h-full w-full border-0 border-transparent"
      >
        <SidebarItems className="p-2">
          {sections.map((section, index) => (
            <SidebarItemGroup key={index}>
              {renderNavEntries(
                section.entries,
                pathname,
                onClose,
                section.approvalCount,
                section.elivaasCount,
                openGroupKeys,
                setOpenGroupKeys
              )}
            </SidebarItemGroup>
          ))}
        </SidebarItems>
      </Sidebar>
    </div>
  );
}
