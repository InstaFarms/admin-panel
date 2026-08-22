import Link from "next/link";
import { ServerPageProps } from "@/utils/types";
import { Badge, Button, Card } from "flowbite-react";
import ManagerEditor from "./UserEditor";
import { getManagerById, getManagerProperties } from "@/actions/userManagementActions";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { USERS_BREADCRUMBS, USERS_ERRORS } from "@/constants/users";
import DeleteManagerButton from "../DeleteManagerButton";

const EDIT_FORM_ID = "manager-edit-form";

export default async function Page({ params, searchParams }: ServerPageProps) {
  const { id } = await params;
  const search = await searchParams;

  let idString = "";
  if (id === undefined) {
    idString = "";
  } else if (typeof id === "string") {
    idString = id;
  } else {
    idString = id[0];
  }

  const [managerResult, propertiesResult] = await Promise.all([
    getManagerById(idString),
    getManagerProperties(idString),
  ]);

  if (managerResult.error || !managerResult.data) {
    throw new Error(managerResult.error || USERS_ERRORS.notFound);
  }

  const data = [managerResult.data];
  const managerProperties = propertiesResult.data || [];

  if (managerProperties.length === 0) {
    throw new Error("There is no such manager exists. Check in All Users Table and remove from there.");
  }

  const activeTab = typeof search?.tab === "string" && search.tab === "properties" ? "properties" : "details";
  const fullName =
    [data[0].firstName, data[0].lastName].filter(Boolean).join(" ").trim() || "Unnamed Manager";
  const detailsHref = `/admin/users/managers/${idString}?tab=details`;
  const propertiesHref = `/admin/users/managers/${idString}?tab=properties`;

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-5">
          <PageBreadcrumb items={USERS_BREADCRUMBS.managers.edit} />

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white">{fullName}</h1>
                <Badge color="info">Manager</Badge>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-slate-300">
                Review contact details and property assignments for this manager profile.
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
              <DeleteManagerButton id={data[0].id} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <section className="border-b border-slate-200 dark:border-gray-700">
            <div className="flex items-end gap-8">
              <Link href={detailsHref} className={`border-b-4 px-4 py-3 text-2xl font-medium transition-colors ${
                activeTab === "details"
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}>Manager Details</Link>
              <Link href={propertiesHref} className={`inline-flex items-center gap-2 border-b-4 px-4 py-3 text-2xl font-medium transition-colors ${
                activeTab === "properties"
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}>
                Assigned Properties
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-gray-700 dark:bg-slate-700 dark:text-slate-200">{managerProperties.length}</span>
              </Link>
            </div>
          </section>

          {activeTab === "details" ? (
            <>
              <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-slate-100 via-white to-slate-100 px-6 py-7 shadow-sm dark:border-gray-700 dark:from-[#111827] dark:via-[#131c2f] dark:to-[#0f172a] xl:px-7">
                <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />
                <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-end">
                  <div className="space-y-5">
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-[0.28em] text-gray-500 dark:text-slate-400">Manager Snapshot</p>
                      <h2 className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">{fullName}</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge color="info">Manager</Badge>
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-300">Properties {managerProperties.length}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-slate-300">
                      <span>Mobile: <span className="font-medium text-gray-900 dark:text-white">{data[0].mobileNumber || "Not added"}</span></span>
                      <span>WhatsApp: <span className="font-medium text-gray-900 dark:text-white">{data[0].whatsappNumber || "Not added"}</span></span>
                    </div>
                  </div>
                  <div className="xl:text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-slate-400">Primary Email</p>
                    <p className="mt-2 break-all text-xl font-semibold text-gray-900 dark:text-white">{data[0].email || "Not added"}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">Primary contact channel on file for this manager.</p>
                  </div>
                </div>
              </section>

              <ManagerEditor data={data[0]} existingProperties={managerProperties} formId={EDIT_FORM_ID} mode="details" />
            </>
          ) : (
            <section className="rounded-[28px] border border-slate-200/80 bg-slate-100/90 shadow-sm dark:border-gray-700 dark:bg-gray-900/90">
              <div className="border-b border-slate-200/80 bg-white/60 px-5 py-4 dark:border-gray-700 dark:bg-white/[0.03]">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Assigned Properties</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">Search, add, remove, and review the properties assigned to this manager.</p>
              </div>
              <div className="p-5">
                <ManagerEditor data={data[0]} existingProperties={managerProperties} formId={EDIT_FORM_ID} mode="properties" />
              </div>
            </section>
          )}
        </div>
      </Card>
    </div>
  );
}
