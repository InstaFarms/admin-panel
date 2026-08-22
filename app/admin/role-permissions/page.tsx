import { Card } from "flowbite-react";
import { isAdmin } from "@/utils/admin-only";
import { getRolePermissionMatrix } from "@/actions/adminRolePermissionsActions";
import RolePermissionsEditor from "./RolePermissionsEditor";
import AuthErrorHandler from "../AuthErrorHandler";

export const dynamic = "force-dynamic";

export default async function RolePermissionsPage() {
  let err = "";
  const admin = await isAdmin().catch((error) => {
    if (error instanceof Error) {
      err = error.message;
    }
  });

  if (!admin) {
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

  if (admin.panelRole !== "SUPER_ADMIN") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
        Only Super Admin can manage role permissions.
      </div>
    );
  }

  const matrix = await getRolePermissionMatrix();

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <RolePermissionsEditor initialMatrix={matrix} />
      </Card>
    </div>
  );
}
