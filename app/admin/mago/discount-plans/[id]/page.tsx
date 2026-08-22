import { Card } from "flowbite-react";
import { ServerPageProps } from "@/utils/types";
import DiscountPlanEditor from "@/components/discount-plans/DiscountPlanEditor";
import { getDiscountPlanById } from "@/actions/discountPlanActions";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { DISCOUNT_PLANS_ERRORS } from "@/constants/discount-plans";
import { getDiscountPlanBrandBreadcrumbs } from "@/constants/planBrandScope";

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

  const data = await getDiscountPlanById(idString, "mago");

  if (!data) {
    throw new Error(DISCOUNT_PLANS_ERRORS.notFound);
  }

  const breadcrumbs = getDiscountPlanBrandBreadcrumbs("mago");

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Discount Plans
          </h5>
          <PageBreadcrumb items={breadcrumbs.edit} className="pb-3" />
        </div>

        <div className="w-full max-w-4xl mx-auto rounded-xl bg-slate-100 p-4 sm:p-6 lg:p-8 dark:bg-gray-900">
          <h6 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
            Edit Discount Plan
          </h6>
          <DiscountPlanEditor data={data} adminScope="mago" />
        </div>
      </Card>
    </div>
  );
}
