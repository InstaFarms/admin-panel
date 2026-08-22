import { Card } from "flowbite-react";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import TagEditor from "../[id]/TagEditor";

const BREADCRUMBS = [
  { href: "/", label: "Home" },
  { href: "/admin", label: "Admin" },
  { href: "/admin/instafarm/instafarms-settings/tags", label: "Tags" },
  { href: "#", label: "Create Tag" },
];

export default async function Page() {
  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Tag
          </h5>
          <PageBreadcrumb items={BREADCRUMBS} />
        </div>
        <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
          <h6 className="mb-4 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            Create New Tag
          </h6>
          <TagEditor />
        </div>
      </Card>
    </div>
  );
}
