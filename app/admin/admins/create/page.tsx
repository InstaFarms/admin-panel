import { Button, Card } from "flowbite-react";
import Link from "next/link";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import AdminProfileInlineEditor from "../[id]/AdminProfileInlineEditor";
import { AdminEditorFormProvider } from "../[id]/AdminEditorFormContext";
import AdminEditorSubmitButton from "../[id]/AdminEditorSubmitButton";
import AdminLiveSnapshotHero from "../[id]/AdminLiveSnapshotHero";
import { getBreadcrumbs } from "@/constants/admin";
import { isAdmin } from "@/utils/admin-only";
import AuthErrorHandler from "../../AuthErrorHandler";

const CREATE_FORM_ID = "admin-create-inline-editor-form";

export default async function CreateAdminPage() {
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

  const canManageRole = currentAdmin.panelRole === "SUPER_ADMIN";

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <AdminEditorFormProvider canManageRole={canManageRole}>
          <div className="flex flex-col gap-5">
            <PageBreadcrumb items={getBreadcrumbs("create")} />

            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Create New Admin
                  </h1>
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-slate-300">
                  Set up identity, role, and contact details using the same admin profile editor.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link href="/admin/admins">
                  <Button color="gray">Cancel</Button>
                </Link>
                <AdminEditorSubmitButton
                  formId={CREATE_FORM_ID}
                  mode="create"
                  canEdit={canManageRole}
                />
              </div>
            </div>

            {!canManageRole ? (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Only a Super Admin can create admin accounts.
              </p>
            ) : null}
          </div>

          <div className="space-y-4">
            <AdminLiveSnapshotHero mode="create" />
            <AdminProfileInlineEditor
              canEdit={canManageRole}
              canManageRole={canManageRole}
              formId={CREATE_FORM_ID}
            />
          </div>
        </AdminEditorFormProvider>
      </Card>
    </div>
  );
}
