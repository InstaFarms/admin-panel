import { Card } from "flowbite-react";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { ServerPageProps } from "@/utils/types";
import CmsEditor from "./CmsEditor";
import { getCmsById } from "@/actions/instafarm-settingsActions";

const BREADCRUMBS = [
  { href: "/", label: "Home" },
  { href: "/admin", label: "Admin" },
  { href: "/admin/instafarm/instafarms-settings/cms", label: "CMS Content" },
  { href: "#", label: "Edit CMS" },
];

export default async function Page({ params }: ServerPageProps) {
  const { id } = await params;
  const idString = Array.isArray(id) ? id[0] : (id ?? "");

  const data = await getCmsById(idString);
  if (!data) throw new Error("Not Found");

  const seoFieldCount = [
    data.meta?.metaTitle,
    data.meta?.metaDescription,
    data.meta?.metaUrl,
    data.meta?.metaImage,
  ].filter((value) => (value ?? "").trim().length > 0).length;

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full border-0 bg-transparent p-0 shadow-none">
        <div className="mb-6 flex flex-col gap-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                  Instafarm CMS
                </span>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    data.isActive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {data.isActive ? "Active" : "Draft"}
                </span>
              </div>
              <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {data.title}
              </h5>
              <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                Edit the content, polish the SEO metadata, and publish with more confidence from a single focused workspace.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-gray-800 dark:ring-gray-700">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">SEO Fields</p>
                <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{seoFieldCount}/4</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-gray-800 dark:ring-gray-700">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Words</p>
                <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
                  {data.content.trim().split(/\s+/).filter(Boolean).length}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-gray-800 dark:ring-gray-700">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Heading</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {data.heading || "Missing"}
                </p>
              </div>
            </div>
          </div>

          <PageBreadcrumb items={BREADCRUMBS} className="bg-transparent p-0" />
        </div>
        <div className="w-full overflow-hidden rounded-[2rem] bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
          <CmsEditor data={data} />
        </div>
      </Card>
    </div>
  );
}
