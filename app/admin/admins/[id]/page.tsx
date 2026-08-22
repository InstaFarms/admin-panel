import { Badge, Button, Card, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  HiChevronUp,
  HiClock,
  HiLogout,
  HiMail,
  HiPencil,
  HiUser,
} from "react-icons/hi";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import CopyValueButton from "./CopyValueButton";
import AdminProfileInlineEditor from "./AdminProfileInlineEditor";
import DeleteAdminButton from "../DeleteAdminButton";
import PermissionSearchInput from "./PermissionSearchInput";
import { getAdminById } from "@/actions/adminActions";
import { getMyAdminPermissions, getRolePermissionMatrix } from "@/actions/adminRolePermissionsActions";
import { isAdmin } from "@/utils/admin-only";
import { formatDateTime } from "@/utils/bookings/formatting";
import { ServerPageProps, type Admin, type AdminPermissionMatrixEntry, type MyAdminPermission } from "@/utils/types";
import AuthErrorHandler from "../../AuthErrorHandler";

export const dynamic = "force-dynamic";
const EDIT_FORM_ID = "admin-profile-inline-editor-form";

type PageTab = "basic" | "permissions";
type PermissionRow = {
  id: string;
  key: string;
  label: string;
  description: string;
  canView: boolean;
  canEdit: boolean;
};

function hasValue(value?: string | null) {
  return Boolean(value && value.trim());
}

function formatRole(value?: string | null) {
  return value ? value.replaceAll("_", " ") : "Not Assigned";
}

function fullName(admin: Admin) {
  return [admin.firstName, admin.lastName].filter(Boolean).join(" ").trim() || "Unnamed Admin";
}

function getAddressField(address: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!address || typeof address !== "object") return "";

  for (const key of keys) {
    const value = address[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getAddressRows(address: Record<string, unknown> | null | undefined) {
  return [
    { label: "Address Line 1", value: getAddressField(address, ["line1", "addressLine1", "address1", "street", "fullAddress"]) },
    { label: "Address Line 2", value: getAddressField(address, ["line2", "addressLine2", "address2"]) },
    { label: "Landmark", value: getAddressField(address, ["landmark"]) },
    { label: "City", value: getAddressField(address, ["city"]) },
    { label: "State", value: getAddressField(address, ["state", "stateName"]) },
    { label: "Country", value: getAddressField(address, ["country"]) },
    { label: "Pincode", value: getAddressField(address, ["pincode", "pinCode", "postalCode", "zipCode"]) },
  ].filter((row) => hasValue(row.value));
}

function countPermissionStats(
  matrixPermissions: AdminPermissionMatrixEntry[] | null,
  myPermissions: MyAdminPermission[] | null,
  role?: string,
) {
  if (matrixPermissions?.length) {
    let viewCount = 0;
    let editCount = 0;

    for (const permission of matrixPermissions) {
      const grant = permission.grants.find((item) => item.role === role);
      if (grant?.canView) viewCount += 1;
      if (grant?.canEdit) editCount += 1;
    }

    return {
      total: matrixPermissions.length,
      canView: viewCount,
      canEdit: editCount,
    };
  }

  if (myPermissions?.length) {
    return {
      total: myPermissions.length,
      canView: myPermissions.filter((permission) => permission.canView).length,
      canEdit: myPermissions.filter((permission) => permission.canEdit).length,
    };
  }

  return null;
}

function formatPermissionLabelFromKey(key: string) {
  return key
    .replaceAll(".", " ")
    .replaceAll("_", " ")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildPermissionDescription(key: string, label: string) {
  const target = label.trim() || formatPermissionLabelFromKey(key);
  return `Access ${target.toLowerCase()} data and related admin actions.`;
}

function buildPermissionRows(
  matrixPermissions: AdminPermissionMatrixEntry[] | null,
  myPermissions: MyAdminPermission[] | null,
  role?: string,
) {
  if (matrixPermissions?.length) {
    return matrixPermissions.map((permission) => {
      const grant = permission.grants.find((item) => item.role === role);

      return {
        id: permission.id,
        key: permission.key,
        label: permission.label,
        description: buildPermissionDescription(permission.key, permission.label),
        canView: Boolean(grant?.canView),
        canEdit: Boolean(grant?.canEdit),
      };
    });
  }

  if (myPermissions?.length) {
    return myPermissions.map((permission) => {
      const label = formatPermissionLabelFromKey(permission.permissionKey);
      return {
        id: permission.permissionKey,
        key: permission.permissionKey,
        label,
        description: buildPermissionDescription(permission.permissionKey, label),
        canView: permission.canView,
        canEdit: permission.canEdit,
      };
    });
  }

  return [];
}

function filterPermissionRows(rows: PermissionRow[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return rows;

  return rows.filter((row) =>
    [row.key, row.label, row.description].some((value) => value.toLowerCase().includes(query))
  );
}

function PermissionSwitch({ enabled, color }: { enabled: boolean; color: "blue" | "green" }) {
  const activeTrack =
    color === "blue"
      ? "bg-blue-500/90 ring-1 ring-blue-300/60 dark:bg-blue-500"
      : "bg-emerald-500/90 ring-1 ring-emerald-300/60 dark:bg-emerald-500";

  return (
    <button
      type="button"
      disabled
      aria-label={enabled ? "Allowed" : "No Access"}
      className="cursor-not-allowed opacity-80"
    >
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled
            ? activeTrack
            : "bg-slate-300 ring-1 ring-slate-200 dark:bg-slate-700 dark:ring-slate-600"
        }`}
        aria-hidden="true"
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

function PermissionGauge({
  activeCount,
  totalCount,
}: {
  activeCount: number;
  totalCount: number;
}) {
  const ratio = totalCount > 0 ? Math.min(activeCount / totalCount, 1) : 0;
  const circumference = 188.4;
  const dashOffset = circumference * (1 - ratio);
  const angle = Math.PI * (1 - ratio);
  const needleX = 70 + Math.cos(angle) * 28;
  const needleY = 60 - Math.sin(angle) * 28;

  return (
    <div className="flex items-center justify-end">
      <svg viewBox="0 0 140 80" className="h-24 w-40">
        <path
          d="M20 60 A50 50 0 0 1 120 60"
          fill="none"
          stroke="currentColor"
          className="text-slate-300 dark:text-slate-700"
          strokeWidth="12"
          strokeLinecap="round"
          pathLength="188.4"
        />
        <path
          d="M20 60 A50 50 0 0 1 120 60"
          fill="none"
          stroke="url(#permissionGaugeGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          pathLength="188.4"
        />
        <line
          x1="70"
          y1="60"
          x2={needleX}
          y2={needleY}
          stroke="currentColor"
          className="text-slate-500 dark:text-slate-300"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="70" cy="60" r="5" className="fill-slate-500 dark:fill-slate-200" />
        <defs>
          <linearGradient id="permissionGaugeGradient" x1="20" y1="60" x2="120" y2="60" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0ea5e9" />
            <stop offset="1" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function InfoList({
  title,
  icon,
  rows,
  emptyMessage,
  emptyAction,
  showCopyButton = false,
}: {
  title: string;
  icon: ReactNode;
  rows: Array<{ label: string; value: string; href?: string }>;
  emptyMessage: string;
  emptyAction?: ReactNode;
  showCopyButton?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-slate-100/90 shadow-sm dark:border-gray-700 dark:bg-gray-900/90">
      <div className="border-b border-slate-200/80 bg-white/60 px-5 py-4 dark:border-gray-700 dark:bg-white/[0.03]">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <div className="p-5">
        {rows.length > 0 ? (
          <div className="space-y-4">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-800/60"
              >
                <div className="mt-0.5 rounded-2xl border border-slate-200 bg-slate-100 p-3 text-slate-500 dark:border-gray-600 dark:bg-gray-800 dark:text-slate-300">
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-slate-400">{row.label}</p>
                      {row.href ? (
                        <a
                          href={row.href}
                          target={row.href.startsWith("https://") ? "_blank" : undefined}
                          rel={row.href.startsWith("https://") ? "noreferrer" : undefined}
                          className="mt-2 block break-words text-xl font-semibold text-gray-900 transition-colors hover:text-blue-600 dark:text-white dark:hover:text-blue-300"
                        >
                          {row.value}
                        </a>
                      ) : (
                        <p className="mt-2 break-words text-xl font-semibold text-gray-900 dark:text-white">{row.value}</p>
                      )}
                    </div>
                    {showCopyButton ? <CopyValueButton value={row.value} label={row.label} /> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 text-center text-base text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-400">
            <div className="space-y-3">
              <p>{emptyMessage}</p>
              {emptyAction}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityTimeline({ admin }: { admin: Admin }) {
  const items = [
    {
      label: "Last Login",
      value: admin.loginAt ? formatDateTime(admin.loginAt) : "",
      icon: <HiClock className="h-5 w-5" />,
      accent: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300",
    },
    {
      label: "Last Logout",
      value: admin.logoutAt ? formatDateTime(admin.logoutAt) : "",
      icon: <HiLogout className="h-5 w-5" />,
      accent: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
    },
    {
      label: "Created At",
      value: admin.createdAt ? formatDateTime(admin.createdAt) : "",
      icon: <HiUser className="h-5 w-5" />,
      accent: "bg-slate-200 text-slate-600 dark:bg-slate-700/70 dark:text-slate-200",
    },
    {
      label: "Updated At",
      value: admin.updatedAt ? formatDateTime(admin.updatedAt) : "",
      icon: <HiPencil className="h-5 w-5" />,
      accent: "bg-slate-200 text-slate-600 dark:bg-slate-700/70 dark:text-slate-200",
    },
  ].filter((item) => hasValue(item.value));

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-slate-100/90 shadow-sm dark:border-gray-700 dark:bg-gray-900/90">
      <div className="border-b border-slate-200/80 bg-white/60 px-5 py-4 dark:border-gray-700 dark:bg-white/[0.03]">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Activity & Session</h2>
      </div>
      <div className="p-5">
        {items.length > 0 ? (
          <div className="space-y-0">
            {items.map((item, index) => (
              <div key={item.label} className="flex gap-4">
                <div className="flex w-10 flex-col items-center">
                  <div className={`rounded-full p-2 ${item.accent}`}>
                    {item.icon}
                  </div>
                  {index < items.length - 1 ? (
                    <div className="mt-2 h-14 w-px bg-slate-300 dark:bg-slate-600" />
                  ) : null}
                </div>
                <div className="pb-10">
                  <p className="text-xs uppercase tracking-[0.16em] text-gray-500 dark:text-slate-400">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 text-center text-base text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-400">
            No activity timestamps are available for this admin yet.
          </div>
        )}
      </div>
    </div>
  );
}

function PermissionsTable({ rows }: { rows: PermissionRow[] }) {
  if (rows.length > 0) {
    return (
      <Table className="min-w-full">
        <TableHead className="bg-slate-200/70 dark:bg-gray-800">
          <TableRow>
            <TableHeadCell className="min-w-[180px]">Key</TableHeadCell>
            <TableHeadCell className="min-w-[200px]">Label</TableHeadCell>
            <TableHeadCell className="min-w-[320px]">Description</TableHeadCell>
            <TableHeadCell className="min-w-[120px]">Can View</TableHeadCell>
            <TableHeadCell className="min-w-[120px]">Can Edit</TableHeadCell>
          </TableRow>
        </TableHead>
        <TableBody className="divide-y">
          {rows.map((row) => (
            <TableRow key={row.id} className="bg-transparent dark:border-slate-700">
              <TableCell className="font-mono text-sm text-gray-700 dark:text-slate-200">{row.key}</TableCell>
              <TableCell className="font-medium text-gray-900 dark:text-white">{row.label}</TableCell>
              <TableCell className="text-sm text-gray-600 dark:text-slate-300">{row.description}</TableCell>
              <TableCell>
                <PermissionSwitch enabled={row.canView} color="blue" />
              </TableCell>
              <TableCell>
                <PermissionSwitch enabled={row.canEdit} color="green" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 px-6 text-center text-lg text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-400">
      Permission summary is only available to Super Admin, or when viewing your own admin profile.
    </div>
  );
}

function getTabHref(adminId: string, tab: PageTab, isEditMode: boolean, permissionSearch?: string) {
  const params = new URLSearchParams();
  const resolvedTab: PageTab = isEditMode ? "basic" : tab;
  if (resolvedTab !== "basic") params.set("tab", resolvedTab);
  if (isEditMode) params.set("mode", "edit");
  if (resolvedTab === "permissions" && hasValue(permissionSearch)) {
    params.set("permissionSearch", permissionSearch!.trim());
  }
  const query = params.toString();
  return `/admin/admins/${adminId}${query ? `?${query}` : ""}`;
}

export default async function AdminDetailsPage({ params, searchParams }: ServerPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const adminId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";
  const mode = resolvedSearchParams.mode;
  const requestedTab = resolvedSearchParams.tab;
  const permissionSearchParam = resolvedSearchParams.permissionSearch;
  const isEditMode = mode === "edit";
  const requestedActiveTab: PageTab = requestedTab === "permissions" ? "permissions" : "basic";
  const activeTab: PageTab = isEditMode ? "basic" : requestedActiveTab;
  const permissionSearch =
    typeof permissionSearchParam === "string"
      ? permissionSearchParam
      : Array.isArray(permissionSearchParam)
        ? permissionSearchParam[0] || ""
        : "";

  let err = "";
  const currentAdmin = await isAdmin().catch((error) => {
    if (error instanceof Error) {
      err = error.message;
    }
  });

  if (!currentAdmin) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-200 p-4 text-center text-black dark:bg-gray-900 dark:text-white">
        <div className="space-y-4">
          <h4 className="text-lg">
            {err || "This account does not have admin access."}
          </h4>
          <AuthErrorHandler errorMessage={err} />
        </div>
      </div>
    );
  }

  const permissions = await getMyAdminPermissions().catch(() => []);
  const canEditAdmins = permissions.some(
    (permission) => permission.permissionKey === "ADMINS" && permission.canEdit
  );
  const canManageRole = currentAdmin.panelRole === "SUPER_ADMIN";

  const admin = await getAdminById(adminId);
  if (!admin) {
    return (
      <div className="flex w-full flex-col">
        <Card className="w-full bg-white dark:bg-gray-800">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            Admin not found.
          </div>
        </Card>
      </div>
    );
  }

  const permissionMatrix = canManageRole
    ? await getRolePermissionMatrix().catch(() => null)
    : null;
  const rolePermissions = permissionMatrix?.permissions ?? null;
  const myPermissionSummary = currentAdmin.id === adminId ? permissions : null;
  const permissionStats = countPermissionStats(rolePermissions, myPermissionSummary, admin.panelRole);
  const permissionRows = buildPermissionRows(rolePermissions, myPermissionSummary, admin.panelRole);
  const filteredPermissionRows = filterPermissionRows(permissionRows, permissionSearch);
  const activePermissionCount = permissionRows.filter((permission) => permission.canView || permission.canEdit).length;
  const permissionCoverage = permissionRows.length > 0
    ? Math.round((activePermissionCount / permissionRows.length) * 100)
    : 0;
  const addressRows = getAddressRows(admin.addressDetails);

  const identityRows = [
    { label: "Email", value: admin.email, href: `mailto:${admin.email}` },
    ...(hasValue(admin.phoneNumber)
      ? [{ label: "Primary Phone", value: admin.phoneNumber!, href: `tel:${admin.phoneNumber!.replace(/\D/g, "")}` }]
      : []),
    ...(hasValue(admin.whatsappNumber)
      ? [{ label: "WhatsApp", value: admin.whatsappNumber!, href: `https://wa.me/91${admin.whatsappNumber!.replace(/\D/g, "")}` }]
      : []),
    ...(hasValue(admin.alternateContact)
      ? [{ label: "Alternate Contact", value: admin.alternateContact!, href: `tel:${admin.alternateContact!.replace(/\D/g, "")}` }]
      : []),
  ];

  const roleRows = [
    { label: "Panel Role", value: formatRole(admin.panelRole) },
    ...(hasValue(admin.gender) ? [{ label: "Gender", value: admin.gender! }] : []),
  ];
  const breadcrumbs = [
    { href: "/", label: "Admins" },
    { href: "/admin/admins", label: "Admin List" },
    { href: `/admin/admins/${adminId}`, label: fullName(admin) },
    { href: "#", label: isEditMode ? "Edit Admin Profile Details" : "Details" },
  ];

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-5">
          <PageBreadcrumb items={breadcrumbs} />

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white">{fullName(admin)}</h1>
                <Badge color="info">{formatRole(admin.panelRole)}</Badge>
                <Badge color="success">ACTIVE</Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isEditMode ? (
                <>
                  <Link href={getTabHref(adminId, activeTab, false, permissionSearch)}>
                    <Button color="gray">Cancel</Button>
                  </Link>
                  <Button
                    type="submit"
                    form={EDIT_FORM_ID}
                    disabled={!canEditAdmins}
                    className="border border-blue-500 bg-blue-600 text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:cursor-not-allowed disabled:border-slate-400 disabled:bg-slate-400 dark:border-blue-400 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus:ring-blue-800"
                  >
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  {canEditAdmins ? (
                    <Link href={getTabHref(adminId, activeTab, true, permissionSearch)}>
                      <Button>
                        <span className="inline-flex items-center gap-2">
                          <HiPencil className="h-4 w-4" />
                          Edit Profile
                        </span>
                      </Button>
                    </Link>
                  ) : null}
                  {canEditAdmins ? <DeleteAdminButton id={adminId} label="Remove Admin" /> : null}
                </>
              )}
            </div>
          </div>

          <div className="border-b border-slate-200 dark:border-gray-700">
            <div className="flex items-end gap-8">
              <Link
                href={getTabHref(adminId, "basic", isEditMode, permissionSearch)}
                className={`border-b-4 px-4 py-3 text-2xl font-medium transition-colors ${
                  activeTab === "basic"
                    ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Basic Details
              </Link>
              {isEditMode ? (
                <span className="cursor-not-allowed border-b-4 border-transparent px-4 py-3 text-2xl font-medium text-gray-400 dark:text-slate-500">
                  Permissions
                </span>
              ) : (
                <Link
                  href={getTabHref(adminId, "permissions", isEditMode, permissionSearch)}
                  className={`border-b-4 px-4 py-3 text-2xl font-medium transition-colors ${
                    activeTab === "permissions"
                      ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  Permissions
                </Link>
              )}
            </div>
          </div>
        </div>

        {isEditMode ? (
          activeTab === "basic" ? (
            <AdminProfileInlineEditor
              adminId={adminId}
              canEdit={canEditAdmins}
              canManageRole={canManageRole}
              formId={EDIT_FORM_ID}
            />
          ) : null
        ) : null}

        {activeTab === "basic" && !isEditMode ? (
          <div className="space-y-4">
            <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-slate-100 via-white to-slate-100 px-6 py-7 shadow-sm dark:border-gray-700 dark:from-[#111827] dark:via-[#131c2f] dark:to-[#0f172a] xl:px-7">
              <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />

              <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-end">
                <div className="space-y-5">
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.28em] text-gray-500 dark:text-slate-400">Admin Snapshot</p>
                    <h2 className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">{fullName(admin)}</h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Badge color="info">{formatRole(admin.panelRole)}</Badge>
                    {hasValue(admin.gender) ? <Badge color="gray">{admin.gender!}</Badge> : null}
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-300">
                      {admin.loginAt ? `Last login ${formatDateTime(admin.loginAt)}` : "No login activity recorded yet"}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-300">
                      {admin.logoutAt ? `Last logout ${formatDateTime(admin.logoutAt)}` : "No logout activity recorded yet"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-slate-300">
                    <span>
                      Admin ID: <span className="font-medium text-gray-900 dark:text-white">{admin.id}</span>
                    </span>
                    <span>
                      Primary contact: <span className="font-medium text-gray-900 dark:text-white">{admin.phoneNumber || "Not added"}</span>
                    </span>
                    <span>
                      Status: <span className="font-medium text-gray-900 dark:text-white">Active</span>
                    </span>
                  </div>
                </div>

                <div className="xl:text-right">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-slate-400">Primary Email</p>
                  <p className="mt-2 break-all text-xl font-semibold text-gray-900 dark:text-white">{admin.email}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">Login identity for this admin account</p>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.12fr_0.88fr]">
              <InfoList
              title="Core Identity"
              icon={<HiMail className="h-5 w-5" />}
              rows={identityRows}
              emptyMessage="No contact details have been added for this admin yet."
              showCopyButton
            />

              <InfoList
                title="Role & Metadata"
                icon={<HiUser className="h-5 w-5" />}
                rows={roleRows}
                emptyMessage="Role metadata is not available for this admin yet."
              />

              <ActivityTimeline admin={admin} />

              <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-slate-100/90 shadow-sm dark:border-gray-700 dark:bg-gray-900/90">
                <div className="border-b border-slate-200/80 bg-white/60 px-5 py-4 dark:border-gray-700 dark:bg-white/[0.03]">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Address</h2>
                </div>
                <div className="p-5">
                  {addressRows.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {addressRows.map((row) => (
                        <div
                          key={row.label}
                          className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-800/60"
                        >
                          <p className="text-xs uppercase tracking-[0.16em] text-gray-500 dark:text-slate-400">{row.label}</p>
                          <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{row.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex min-h-[250px] items-center rounded-[24px] border border-dashed border-slate-300 bg-white/70 px-6 py-6 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-400">
                      <div className="max-w-md space-y-4 text-left">
                        <p className="text-xl font-medium text-gray-700 dark:text-slate-200">No address details have been added for this admin yet.</p>
                        <p className="text-sm text-gray-500 dark:text-slate-300">
                          Add a mailing address so support and operations teams have a complete admin profile on file.
                        </p>
                        {canEditAdmins ? (
                          <Link href={getTabHref(adminId, "basic", true)} className="inline-flex">
                            <Button size="sm">Add Address Details</Button>
                          </Link>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-slate-300">
                            Ask a Super Admin or authorized team member to update this profile.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "permissions" ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-100 dark:border-gray-700 dark:bg-gray-900">
              <div className="border-b border-slate-200 px-4 py-3 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Permission Overview</h2>
              </div>
              <div className="grid grid-cols-1 gap-6 px-4 py-5 lg:grid-cols-[1fr_220px] lg:items-center">
                <div className="space-y-3">
                  <p className="text-6xl font-bold leading-none text-teal-600 dark:text-teal-300">
                    {activePermissionCount}
                  </p>
                  <div className="space-y-1">
                    <p className="text-xl font-medium text-gray-900 dark:text-white">Total Active Permissions</p>
                    <p className="text-sm text-gray-500 dark:text-slate-300">
                      Effective permissions for the {formatRole(admin.panelRole).toLowerCase()} role.
                    </p>
                  </div>
                  {permissionStats ? (
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <Badge color="info">Total {permissionStats.total}</Badge>
                      <Badge color="success">View {permissionStats.canView}</Badge>
                      <Badge color="success">Edit {permissionStats.canEdit}</Badge>
                      <span className="text-sm text-gray-500 dark:text-slate-300">{permissionCoverage}% coverage</span>
                    </div>
                  ) : null}
                </div>
                <PermissionGauge activeCount={activePermissionCount} totalCount={permissionRows.length} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-100 dark:border-gray-700 dark:bg-gray-900">
              <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-3 dark:border-gray-700 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Permission Matrix</h2>
                  <HiChevronUp className="h-4 w-4 text-gray-400 dark:text-slate-400" />
                </div>

                <PermissionSearchInput
                  initialValue={permissionSearch}
                  isEditMode={isEditMode}
                />
              </div>

              <div className="overflow-x-auto p-4">
                {permissionSearch && filteredPermissionRows.length !== permissionRows.length ? (
                  <p className="mb-3 text-sm text-gray-500 dark:text-slate-300">
                    Showing {filteredPermissionRows.length} of {permissionRows.length} permissions for "{permissionSearch}".
                  </p>
                ) : null}
                <PermissionsTable rows={filteredPermissionRows} />
              </div>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
