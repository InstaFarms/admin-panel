import { getBlockingReasonById } from "@/actions/blockingReasonActions";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BlockingReasonForm from "@/components/blocking-reasons/BlockingReasonForm";
import {
  BLOCKING_REASON_BREADCRUMBS,
  BLOCKING_REASON_ERRORS,
} from "@/constants/blockingReasons";
import { ServerPageProps } from "@/utils/types";
import { Card } from "flowbite-react";

export default async function EditBlockingReasonPage({
  params,
}: ServerPageProps) {
  const { id } = await params;
  const idString = Array.isArray(id) ? id[0] : (id ?? "");
  const data = await getBlockingReasonById(idString);

  if (!data) {
    throw new Error(BLOCKING_REASON_ERRORS.notFound);
  }

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Blocking Reasons
          </h5>
          <PageBreadcrumb items={BLOCKING_REASON_BREADCRUMBS.edit} />
        </div>

        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5 overflow-x-auto rounded-xl bg-slate-100 p-5 transition-all duration-200 dark:bg-gray-900">
          <h6 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            Edit Blocking Reason
          </h6>
          <BlockingReasonForm data={data} />
        </div>
      </Card>
    </div>
  );
}
