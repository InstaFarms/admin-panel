import { getCommissionBookingSourceById } from "@/actions/sourceCommissionActions";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import SourceCommissionForm from "@/components/source-commissions/SourceCommissionForm";
import {
  SOURCE_COMMISSION_BREADCRUMBS,
  SOURCE_COMMISSION_ERRORS,
} from "@/constants/sourceCommissions";
import { ServerPageProps } from "@/utils/types";
import { Card } from "flowbite-react";

export default async function EditSourceCommissionPage({
  params,
}: ServerPageProps) {
  const { id } = await params;
  const idString = Array.isArray(id) ? id[0] : (id ?? "");
  const data = await getCommissionBookingSourceById(idString);

  if (!data) {
    throw new Error(SOURCE_COMMISSION_ERRORS.notFound);
  }

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            SourceCommissions
          </h5>
          <PageBreadcrumb items={SOURCE_COMMISSION_BREADCRUMBS.edit} />
        </div>

        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5 overflow-x-auto rounded-xl bg-slate-100 p-5 transition-all duration-200 dark:bg-gray-900">
          <h6 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            Edit Commission Source
          </h6>
          <SourceCommissionForm data={data} />
        </div>
      </Card>
    </div>
  );
}
