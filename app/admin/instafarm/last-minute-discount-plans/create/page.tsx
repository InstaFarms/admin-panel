import { Card } from "flowbite-react";

import LastMinuteDiscountPlanEditor from "@/components/last-minute-discount-plans/LastMinuteDiscountPlanEditor";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { getLastMinuteDiscountPlanBrandBreadcrumbs } from "@/constants/planBrandScope";

export default async function Page() {
  const breadcrumbs = getLastMinuteDiscountPlanBrandBreadcrumbs("instafarms");

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Last Minute Discount Plans
          </h5>
          <PageBreadcrumb items={breadcrumbs.create} className="pb-3" />
        </div>

        <div className="mx-auto w-full max-w-5xl rounded-xl bg-slate-100 p-4 sm:p-6 lg:p-8 dark:bg-gray-900">
          <LastMinuteDiscountPlanEditor
            adminScope="instafarms"
            title="Create New Last Minute Discount Plan"
          />
        </div>
      </Card>
    </div>
  );
}
