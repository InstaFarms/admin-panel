import { Card } from "flowbite-react";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { ServerPageProps } from "@/utils/types";
import CmsEditor from "@/app/admin/instafarm/instafarms-settings/cms/[id]/CmsEditor";
import { getCmsById } from "@/actions/instafarm-settingsActions";
import { BRAND_CONTENT_ROUTES } from "@/constants/brandAdminScope";

const SCOPE = "mago" as const;

export default async function Page({ params }: ServerPageProps) {
  const { id } = await params;
  const idString = Array.isArray(id) ? id[0] : (id ?? "");

  const data = await getCmsById(idString, SCOPE);
  if (!data) throw new Error("Not Found");

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            CMS Content
          </h5>
          <PageBreadcrumb
            items={[
              { href: "/", label: "Home" },
              { href: "/admin", label: "Admin" },
              { href: BRAND_CONTENT_ROUTES[SCOPE].cms, label: "CMS Content" },
              { href: "#", label: "Edit CMS" },
            ]}
          />
        </div>
        <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
          <h6 className="mb-4 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            Edit CMS Content
          </h6>
          <CmsEditor data={data} brandScope={SCOPE} />
        </div>
      </Card>
    </div>
  );
}
