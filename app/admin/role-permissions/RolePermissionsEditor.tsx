"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Spinner,
} from "flowbite-react";
import toast from "react-hot-toast";
import type { AdminPanelRole, AdminPermissionKey } from "@repo/db/types";
import type { AdminPermissionMatrix } from "@/utils/types";
import {
  resetRolePermissionsToDefaults,
  syncDefaultPermissions,
  updateRolePermissions,
} from "@/actions/adminRolePermissionsActions";
import {
  formatPermissionKeyLabel,
  PERMISSION_CATEGORY_ORDER,
  PERMISSION_PRESENTATION,
  type PermissionRiskLevel,
} from "./permissionPresentation";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import ConfirmModal from "@/components/ConfirmModal";

interface RolePermissionsEditorProps {
  initialMatrix: AdminPermissionMatrix;
}

type RoleGrantState = Record<AdminPermissionKey, { canView: boolean; canEdit: boolean }>;
type FilterMode = "all" | "changed" | "highRisk";
type PermissionRow = {
  id: string;
  key: AdminPermissionKey;
  label: string;
  category: string;
  description: string;
  risk: PermissionRiskLevel;
  canView: boolean;
  canEdit: boolean;
  changed: boolean;
};

function buildRoleState(matrix: AdminPermissionMatrix, role: AdminPanelRole): RoleGrantState {
  const state = {} as RoleGrantState;
  for (const permission of matrix.permissions) {
    const grant = permission.grants.find((g) => g.role === role);
    state[permission.key] = {
      canView: grant?.canView ?? false,
      canEdit: grant?.canEdit ?? false,
    };
  }
  return state;
}

function buildGrantMap(
  matrix: AdminPermissionMatrix,
  roles: AdminPanelRole[],
): Record<AdminPanelRole, RoleGrantState> {
  const map = {} as Record<AdminPanelRole, RoleGrantState>;
  for (const role of roles) {
    map[role] = buildRoleState(matrix, role);
  }
  return map;
}

function isGrantEqual(
  left: { canView: boolean; canEdit: boolean } | undefined,
  right: { canView: boolean; canEdit: boolean } | undefined,
) {
  return (left?.canView ?? false) === (right?.canView ?? false) &&
    (left?.canEdit ?? false) === (right?.canEdit ?? false);
}

function formatRoleLabel(role: AdminPanelRole) {
  return role.replaceAll("_", " ");
}

function roleStateDiffers(
  current: RoleGrantState | undefined,
  baseline: RoleGrantState | undefined,
) {
  if (!current) return false;
  return Object.keys(current).some((permissionKey) => {
    const key = permissionKey as AdminPermissionKey;
    return !isGrantEqual(current[key], baseline?.[key]);
  });
}

export default function RolePermissionsEditor({ initialMatrix }: RolePermissionsEditorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const roles = useMemo(() => initialMatrix.roles, [initialMatrix.roles]);
  const [selectedRole, setSelectedRole] = useState<AdminPanelRole>(roles[0] ?? "OPS_TEAM");
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [resetModalOpen, setResetModalOpen] = useState(false);
  // Non-null while the "leave without saving?" prompt is open; holds the route
  // the user tried to navigate to.
  const [pendingNavHref, setPendingNavHref] = useState<string | null>(null);

  const [grantsByRole, setGrantsByRole] = useState<Record<AdminPanelRole, RoleGrantState>>(
    () => buildGrantMap(initialMatrix, roles)
  );
  const [baselineByRole, setBaselineByRole] = useState<Record<AdminPanelRole, RoleGrantState>>(
    () => buildGrantMap(initialMatrix, roles)
  );

  useEffect(() => {
    setSelectedRole((prev) => (roles.includes(prev) ? prev : roles[0] ?? "OPS_TEAM"));
    setGrantsByRole(buildGrantMap(initialMatrix, roles));
    setBaselineByRole(buildGrantMap(initialMatrix, roles));
  }, [initialMatrix, roles]);

  const selectedRoleState = useMemo(
    () => grantsByRole[selectedRole] || ({} as RoleGrantState),
    [grantsByRole, selectedRole]
  );
  const selectedBaselineState = useMemo(
    () => baselineByRole[selectedRole] || ({} as RoleGrantState),
    [baselineByRole, selectedRole]
  );

  // Unsaved edits are held per role in `grantsByRole`, so the navigation guard
  // has to look at every role - not just the one currently on screen. Switching
  // the role dropdown after editing must not "hide" the pending change from the
  // guard.
  const hasAnyUnsavedChanges = useMemo(
    () => roles.some((role) => roleStateDiffers(grantsByRole[role], baselineByRole[role])),
    [roles, grantsByRole, baselineByRole],
  );

  // Ref mirror so the DOM listeners below always read the latest value without
  // re-binding on every keystroke.
  const unsavedRef = useRef(hasAnyUnsavedChanges);
  useEffect(() => {
    unsavedRef.current = hasAnyUnsavedChanges;
  }, [hasAnyUnsavedChanges]);

  // (1) Hard navigation (reload, tab close, address bar, external link).
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!unsavedRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // (2) In-app navigation (Next.js <Link> clicks - sidebar, breadcrumb, etc).
  // `beforeunload` never fires for these, so intercept the click in the capture
  // phase before the router handles it and ask first.
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!unsavedRef.current) return;
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as HTMLElement | null)?.closest(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank") return;

      const href = anchor.getAttribute("href");
      // Only guard in-app navigations to a different route.
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      if (href === pathname || href.split("?")[0] === pathname) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingNavHref(href);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  const confirmLeave = () => {
    const href = pendingNavHref;
    setPendingNavHref(null);
    if (!href) return;
    unsavedRef.current = false; // don't re-prompt on the programmatic push
    router.push(href);
  };

  const permissionRows = useMemo<PermissionRow[]>(() => {
    return initialMatrix.permissions.map((permission) => {
      const currentGrant = selectedRoleState[permission.key] || {
        canView: false,
        canEdit: false,
      };
      const baselineGrant = selectedBaselineState[permission.key] || {
        canView: false,
        canEdit: false,
      };
      const metadata = PERMISSION_PRESENTATION[permission.key];

      return {
        id: permission.id,
        key: permission.key,
        label: metadata?.label || permission.label || formatPermissionKeyLabel(permission.key),
        category: metadata?.category || "Other",
        description:
          metadata?.description ||
          `Manage access for ${permission.label || formatPermissionKeyLabel(permission.key).toLowerCase()}.`,
        risk: metadata?.risk || "normal",
        canView: currentGrant.canView,
        canEdit: currentGrant.canEdit,
        changed: !isGrantEqual(currentGrant, baselineGrant),
      };
    });
  }, [initialMatrix.permissions, selectedRoleState, selectedBaselineState]);

  const filteredPermissionRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return permissionRows.filter((permission) => {
      const matchesFilter =
        filterMode === "all" ||
        (filterMode === "changed" && permission.changed) ||
        (filterMode === "highRisk" && permission.risk === "high");

      if (!matchesFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        permission.label,
        permission.key,
        permission.description,
        permission.category,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [filterMode, permissionRows, search]);

  const groupedPermissions = useMemo(() => {
    const grouped = new Map<string, PermissionRow[]>();

    for (const permission of filteredPermissionRows) {
      const bucket = grouped.get(permission.category) || [];
      bucket.push(permission);
      grouped.set(permission.category, bucket);
    }

    return Array.from(grouped.entries())
      .sort((left, right) => {
        const leftIndex = PERMISSION_CATEGORY_ORDER.indexOf(left[0] as (typeof PERMISSION_CATEGORY_ORDER)[number]);
        const rightIndex = PERMISSION_CATEGORY_ORDER.indexOf(right[0] as (typeof PERMISSION_CATEGORY_ORDER)[number]);
        const safeLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
        const safeRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
        return safeLeft - safeRight || left[0].localeCompare(right[0]);
      })
      .map(([category, items]) => ({
        category,
        items: items.sort((a, b) => a.label.localeCompare(b.label)),
      }));
  }, [filteredPermissionRows]);

  const dirtyCount = permissionRows.filter((permission) => permission.changed).length;
  const enabledViewCount = permissionRows.filter((permission) => permission.canView).length;
  const enabledEditCount = permissionRows.filter((permission) => permission.canEdit).length;
  const highRiskCount = permissionRows.filter((permission) => permission.risk === "high" && (permission.canView || permission.canEdit)).length;
  const hasUnsavedChanges = dirtyCount > 0;
  const isSuperAdminSelected = selectedRole === "SUPER_ADMIN";

  const setGrant = (permissionKey: AdminPermissionKey, next: Partial<{ canView: boolean; canEdit: boolean }>) => {
    setGrantsByRole((prev) => {
      const roleState = prev[selectedRole] || ({} as RoleGrantState);
      const current = roleState[permissionKey] || { canView: false, canEdit: false };
      const merged = { ...current, ...next };
      if (merged.canEdit && !merged.canView) {
        merged.canView = true;
      }

      return {
        ...prev,
        [selectedRole]: {
          ...roleState,
          [permissionKey]: merged,
        },
      };
    });
  };

  const handleSave = async () => {
    const items = Object.entries(selectedRoleState).map(([permissionKey, grant]) => ({
      permissionKey: permissionKey as AdminPermissionKey,
      canView: grant.canView,
      canEdit: grant.canEdit,
    }));

    setIsSaving(true);
    try {
      const result = await updateRolePermissions(selectedRole, items);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setBaselineByRole((prev) => ({
        ...prev,
        [selectedRole]: {
          ...selectedRoleState,
        },
      }));
      toast.success(result.success || `${formatRoleLabel(selectedRole)} permissions updated`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncDefaults = async () => {
    setIsSyncing(true);
    try {
      const result = await syncDefaultPermissions();
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result.success || "Synced defaults");
      router.refresh();
    } finally {
      setIsSyncing(false);
    }
  };

  const runResetDefaults = async () => {
    setIsResetting(true);
    try {
      const result = await resetRolePermissionsToDefaults(selectedRole);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      const nextRoleState = {} as RoleGrantState;
      for (const permission of initialMatrix.permissions) {
        const match = result.data?.find((item) => item.permissionKey === permission.key);
        nextRoleState[permission.key] = {
          canView: match?.canView ?? false,
          canEdit: match?.canEdit ?? false,
        };
      }

      setGrantsByRole((prev) => ({
        ...prev,
        [selectedRole]: nextRoleState,
      }));
      setBaselineByRole((prev) => ({
        ...prev,
        [selectedRole]: nextRoleState,
      }));

      toast.success(result.success || `${formatRoleLabel(selectedRole)} permissions reset to defaults`);
      router.refresh();
    } finally {
      setIsResetting(false);
      setResetModalOpen(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-6 text-slate-900 shadow-xl dark:border-slate-700 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 dark:text-white">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white dark:bg-white dark:text-slate-900">
                Role permissions
              </span>
              <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-400/20 dark:text-violet-100">
                Super Admin only
              </span>
              {isSuperAdminSelected ? <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-medium text-sky-700 dark:bg-sky-400/20 dark:text-sky-100">Read only</span> : null}
              {hasUnsavedChanges ? (
                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-400/20 dark:text-amber-100">{dirtyCount} unsaved changes</span>
              ) : hasAnyUnsavedChanges ? (
                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-400/20 dark:text-amber-100">Unsaved changes on another role</span>
              ) : (
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-100">All changes saved</span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Role Permissions
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                {isSuperAdminSelected
                  ? "Super Admin always has full access across the platform and is shown here as a read-only reference."
                  : "Manage view and edit access across the admin panel with clearer role-based controls and safer change review."}
              </p>
              <PageBreadcrumb
                items={[
                  { href: "/", label: "Home" },
                  { href: "/admin", label: "Admin" },
                  { href: "/admin/role-permissions", label: "Role Permissions" },
                ]}
                className="mt-4 text-slate-500 dark:text-slate-200"
              />
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="roleSelect" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Editing role
              </label>
              <select
                id="roleSelect"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as AdminPanelRole)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm [color-scheme:light] dark:border-white/10 dark:bg-white/10 dark:text-white dark:[color-scheme:dark]"
              >
                {roles.map((role) => (
                  <option key={role} value={role} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                    {formatRoleLabel(role)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[440px]">
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Role</p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{formatRoleLabel(selectedRole)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">View Access</p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{enabledViewCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Edit Access</p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{enabledEditCount}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-400/20 dark:bg-amber-400/10">
              <p className="text-xs uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">High Risk</p>
              <p className="mt-2 text-lg font-semibold text-amber-900 dark:text-amber-50">{highRiskCount}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search permission, key, or category"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 md:min-w-[320px] dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-300"
            />
            <div className="grid w-full grid-cols-3 gap-2 md:w-auto md:min-w-[320px]">
              {([
                { key: "all", label: "All" },
                { key: "changed", label: "Changed" },
                { key: "highRisk", label: "High Risk" },
              ] as const).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setFilterMode(option.key)}
                  className={`rounded-full border px-3 py-2 text-center text-sm font-medium transition-colors ${
                    filterMode === option.key
                      ? "border-sky-500 bg-sky-500 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:border-white/20 dark:hover:bg-white/15"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void handleSave()} disabled={isSuperAdminSelected || isSaving || isResetting || isSyncing || !hasUnsavedChanges}>
              {isSaving ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Saving changes...
                </>
              ) : (
                `Save Permissions${hasUnsavedChanges ? ` (${dirtyCount})` : ""}`
              )}
            </Button>
            <Button
              color="failure"
              onClick={() => setResetModalOpen(true)}
              disabled={isSuperAdminSelected || isResetting || isSyncing || isSaving}
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-300 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900"
            >
              {isResetting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Resetting role...
                </>
              ) : (
                "Reset Role Defaults"
              )}
            </Button>
            <Button color="gray" onClick={handleSyncDefaults} disabled={isSuperAdminSelected || isResetting || isSyncing || isSaving}>
              {isSyncing ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Syncing defaults...
                </>
              ) : (
                "Sync Defaults"
              )}
            </Button>
          </div>
        </div>

        {isSuperAdminSelected ? (
          <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-100">
            Super Admin always has full platform access. This role is shown here for visibility only, so its permissions cannot be edited or reset from this screen.
          </div>
        ) : null}
      </section>

      <div className="space-y-4">
        {permissionRows.length === 0 ? (
          <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-6 text-sm text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-800/90 dark:text-gray-300">
            No permissions found yet. Click <strong>Sync Defaults</strong> to seed role permissions.
          </div>
        ) : groupedPermissions.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 px-6 py-10 text-center text-sm text-gray-500 dark:border-slate-700 dark:bg-gray-800/70 dark:text-slate-300">
            No permissions match the current filters.
          </div>
        ) : groupedPermissions.map((group) => (
          <section
            key={group.category}
            className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 shadow-sm dark:border-gray-700 dark:bg-gray-800/90"
          >
            <div className="border-b border-slate-200/80 bg-slate-50/90 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/70">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{group.category}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">
                    {group.items.length} permission{group.items.length === 1 ? "" : "s"} in this group
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.items.some((item) => item.changed) ? <Badge color="warning">Changed</Badge> : null}
                  {group.items.some((item) => item.risk === "high") ? <Badge color="failure">High Risk</Badge> : null}
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-200/80 dark:divide-slate-700">
              {group.items.map((permission) => (
                <div
                  key={permission.id}
                  className={`grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_120px_120px] md:items-center ${
                    permission.changed
                      ? "bg-blue-50/70 dark:bg-blue-500/10"
                      : permission.risk === "high"
                        ? "bg-amber-50/40 dark:bg-amber-500/5"
                        : "bg-white/90 dark:bg-gray-800/90"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-gray-900 dark:text-white">{permission.label}</p>
                      <Badge color="gray">{permission.key}</Badge>
                      {permission.risk === "high" ? <Badge color="failure">High Risk</Badge> : null}
                      {permission.changed ? <Badge color="warning">Modified</Badge> : null}
                    </div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-slate-300">{permission.description}</p>
                  </div>

                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 md:justify-center md:gap-3">
                    <span>View</span>
                    <input
                      type="checkbox"
                      checked={permission.canView}
                      disabled={isSuperAdminSelected}
                      onChange={(e) =>
                        setGrant(permission.key, {
                          canView: e.target.checked,
                          canEdit: e.target.checked ? permission.canEdit : false,
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800"
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 md:justify-center md:gap-3">
                    <span>Edit</span>
                    <input
                      type="checkbox"
                      checked={permission.canEdit}
                      disabled={isSuperAdminSelected}
                      onChange={(e) =>
                        setGrant(permission.key, {
                          canEdit: e.target.checked,
                          canView: e.target.checked ? true : permission.canView,
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800"
                    />
                  </label>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <ConfirmModal
        showModal={resetModalOpen}
        tone="danger"
        title={`Reset ${formatRoleLabel(selectedRole)} permissions?`}
        confirmationText={`This replaces the current view and edit access for ${formatRoleLabel(
          selectedRole,
        )} with the default template. Unsaved edits to this role are discarded.`}
        confirmLabel="Reset to defaults"
        loadingLabel="Resetting…"
        loading={isResetting}
        acceptCallback={() => void runResetDefaults()}
        closeCallback={() => {
          if (!isResetting) setResetModalOpen(false);
        }}
      />

      <ConfirmModal
        showModal={pendingNavHref !== null}
        tone="warning"
        title="Leave without saving?"
        confirmationText="You have unsaved permission changes. They'll be lost if you leave this page."
        confirmLabel="Leave"
        cancelLabel="Stay"
        acceptCallback={confirmLeave}
        closeCallback={() => setPendingNavHref(null)}
      />
    </div>
  );
}
