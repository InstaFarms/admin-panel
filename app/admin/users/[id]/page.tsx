import { Badge, Button, Card } from "flowbite-react";
import { ServerPageProps } from "@/utils/types";
import { getUser } from "@/actions/userActions";
import UserEditor from "./UserEditor";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { USERS_BREADCRUMBS, USERS_ERRORS } from "@/constants/users";
import DeleteUserButton from "../DeleteAdminButton";

const EDIT_FORM_ID = "all-users-edit-form";

export default async function Page({ params }: ServerPageProps) {
  const { id } = await params;

  let idString = "";
  if (id === undefined) {
    idString = "";
  } else if (typeof id === "string") {
    idString = id;
  } else {
    idString = id[0];
  }
  
  let data;
  try {
    const result = await getUser(idString);
    if (result.error) {
      throw new Error(result.error);
    }
    data = result.data;
  } catch (err) {
    console.log("Error fetching user: ", err);
    throw new Error(USERS_ERRORS.notFound);
  }

  if (!data) {
    throw new Error(USERS_ERRORS.notFound);
  }

  const fullName =
    [data.firstName, data.lastName].filter(Boolean).join(" ").trim() || "Unnamed User";

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-5">
          <PageBreadcrumb items={USERS_BREADCRUMBS.allusers.edit} />

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white">{fullName}</h1>
                <Badge color="info">User</Badge>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-slate-300">
                Review and update this user profile using the same guided editor structure as property users.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                form={EDIT_FORM_ID}
                className="border border-blue-500 bg-blue-600 text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:border-blue-400 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus:ring-blue-800"
              >
                Save Changes
              </Button>
              <DeleteUserButton id={data.id} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <section className="border-b border-slate-200 dark:border-gray-700">
            <div className="flex items-end gap-8">
              <div className="border-b-4 border-blue-600 px-4 py-3 text-2xl font-medium text-blue-600 dark:border-blue-400 dark:text-blue-400">
                User Details
              </div>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-slate-100 via-white to-slate-100 px-6 py-7 shadow-sm dark:border-gray-700 dark:from-[#111827] dark:via-[#131c2f] dark:to-[#0f172a] xl:px-7">
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-end">
              <div className="space-y-5">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.28em] text-gray-500 dark:text-slate-400">User Snapshot</p>
                  <h2 className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">{fullName}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge color="info">User</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-slate-300">
                  <span>Mobile: <span className="font-medium text-gray-900 dark:text-white">{data.mobileNumber || "Not added"}</span></span>
                  <span>WhatsApp: <span className="font-medium text-gray-900 dark:text-white">{data.whatsappNumber || "Not added"}</span></span>
                </div>
              </div>
              <div className="xl:text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-slate-400">Primary Email</p>
                <p className="mt-2 break-all text-xl font-semibold text-gray-900 dark:text-white">{data.email || "Not added"}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">Primary contact channel on file for this user.</p>
              </div>
            </div>
          </section>

          <UserEditor data={data} formId={EDIT_FORM_ID} />
        </div>
      </Card>
    </div>
  );
}
