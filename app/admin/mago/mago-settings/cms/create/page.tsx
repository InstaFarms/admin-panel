import { Card } from "flowbite-react";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import CmsEditor from "@/app/admin/instafarm/instafarms-settings/cms/[id]/CmsEditor";
import { BRAND_CONTENT_ROUTES } from "@/constants/brandAdminScope";

const SCOPE = "mago" as const;

const BREADCRUMBS = [
  { href: "/", label: "Home" },
  { href: "/admin", label: "Admin" },
  { href: BRAND_CONTENT_ROUTES[SCOPE].cms, label: "CMS Content" },
  { href: "#", label: "Create CMS" },
];

export default async function Page() {
  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            CMS Content
          </h5>
          <PageBreadcrumb items={BREADCRUMBS} />
        </div>
        <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
          <h6 className="mb-4 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            Create New CMS Content
          </h6>
          <CmsEditor brandScope={SCOPE} />
        </div>
      </Card>
    </div>
  );
}
