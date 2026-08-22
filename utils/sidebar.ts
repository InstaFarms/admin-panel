import type {
  ActiveMatch,
  SidebarNavEntry,
  SidebarNavGroup,
  SidebarNavGroupChild,
} from "@/components/layout/sidebarNavConfig";

export function isActive(
  pathname: string,
  href: string,
  activeMatch?: ActiveMatch
): boolean {
  if (activeMatch === undefined) return false;
  if (activeMatch === "exact") return pathname === href;
  return pathname === activeMatch || pathname.startsWith(activeMatch + "/");
}

export function findActiveGroupLabel(
  entries: SidebarNavEntry[],
  pathname: string
): string | null {
  for (const entry of entries) {
    if (entry.type === "group") {
      const hasActive = hasActiveInGroup(entry.group.items, pathname);
      if (hasActive) return entry.group.label;
    }
  }
  return null;
}

export function isGroupChild(child: SidebarNavGroupChild): child is SidebarNavGroup {
  return "items" in child;
}

export function hasActiveInGroup(items: SidebarNavGroupChild[], pathname: string): boolean {
  return items.some((child) => {
    if (isGroupChild(child)) return hasActiveInGroup(child.items, pathname);
    return isActive(pathname, child.href, child.activeMatch);
  });
}

export function findActiveGroupKeys(
  entries: SidebarNavEntry[],
  pathname: string
): string[] {
  const keys: string[] = [];

  const collect = (items: SidebarNavGroupChild[], parentKey: string): boolean => {
    let foundInLevel = false;

    for (const child of items) {
      if (isGroupChild(child)) {
        const childKey = `${parentKey}/${child.label}`;
        const childHasActive = collect(child.items, childKey);
        if (childHasActive) {
          keys.push(childKey);
          foundInLevel = true;
        }
      } else if (isActive(pathname, child.href, child.activeMatch)) {
        foundInLevel = true;
      }
    }

    return foundInLevel;
  };

  for (const entry of entries) {
    if (entry.type !== "group") continue;
    const groupKey = entry.group.label;
    const hasActive = collect(entry.group.items, groupKey);
    if (hasActive) keys.push(groupKey);
  }

  return keys;
}
