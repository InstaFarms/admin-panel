import { Card } from "flowbite-react";

import { getLastMinuteDiscountPlanById } from "@/actions/lastMinuteDiscountPlanActions";
import LastMinuteDiscountPlanEditor from "@/components/last-minute-discount-plans/LastMinuteDiscountPlanEditor";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { LAST_MINUTE_DISCOUNT_PLANS_ERRORS } from "@/constants/last-minute-discount-plans";
import { getLastMinuteDiscountPlanBrandBreadcrumbs } from "@/constants/planBrandScope";
import type { ServerPageProps } from "@/utils/types";

export default async function Page({ params }: ServerPageProps) {
  const { id } = await params;
  const idString = Array.isArray(id) ? id[0] : id ?? "";
  const data = await getLastMinuteDiscountPlanById(idString, "instafarms");

  if (!data) {
    throw new Error(LAST_MINUTE_DISCOUNT_PLANS_ERRORS.notFound);
  }

  const breadcrumbs = getLastMinuteDiscountPlanBrandBreadcrumbs("instafarms");

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Last Minute Discount Plans
          </h5>
          <PageBreadcrumb items={breadcrumbs.edit} className="pb-3" />
        </div>

        <div className="mx-auto w-full max-w-5xl rounded-xl bg-slate-100 p-4 sm:p-6 lg:p-8 dark:bg-gray-900">
          <LastMinuteDiscountPlanEditor
            data={data}
            adminScope="instafarms"
            title="Edit Last Minute Discount Plan"
          />
        </div>
      </Card>
    </div>
  );
}
