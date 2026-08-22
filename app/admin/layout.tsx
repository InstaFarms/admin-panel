/**
 * Admin layout: wraps all /admin/* routes.
 * - Enforces admin auth; shows error UI if not authorized.
 * - Renders sidebar (nav + approval badge) and scrollable content area.
 */
import AdminSidebar from "@/components/Sidebar";
import ContentArea from "@/components/ContentArea";
import { isAdmin } from "@/utils/admin-only";
import { getPendingBookingConfirmationCount } from "@/actions/bookingConfirmationActions";
import { getMyAdminPermissions } from "@/actions/adminRolePermissionsActions";
import { getElvaasCanelCount } from "@/actions/elivaasActions";
import React from "react";
import AuthErrorHandler from "./AuthErrorHandler";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let err: string = "";
  const admin = await isAdmin().catch((error) => {
    if (error instanceof Error) {
      err = error.message;
    }
  });

  // Unauthorized: show error message and AuthErrorHandler (expired / access denied / generic)
  if (!admin) {
    console.error("Auth error:", err);
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

  const [approvalCount, elivaasCount, permissions] = await Promise.all([
    getPendingBookingConfirmationCount(),
    getElvaasCanelCount(),
    getMyAdminPermissions().catch(() => undefined),
  ]);

  // Authorized: sidebar + scrollable content area
  return (
    <div className="flex h-full w-full">
      <AdminSidebar approvalCount={approvalCount} elivaasCount={elivaasCount} permissions={permissions} />
      <ContentArea>{children}</ContentArea>
    </div>
  );
}