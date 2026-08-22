import PageBreadcrumb from "@/components/PageBreadcrumb";
import BlockingReasonForm from "@/components/blocking-reasons/BlockingReasonForm";
import { BLOCKING_REASON_BREADCRUMBS } from "@/constants/blockingReasons";
import { Card } from "flowbite-react";

export default function CreateBlockingReasonPage() {
  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Blocking Reasons
          </h5>
          <PageBreadcrumb items={BLOCKING_REASON_BREADCRUMBS.create} />
        </div>

        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5 overflow-x-auto rounded-xl bg-slate-100 p-5 transition-all duration-200 dark:bg-gray-900">
          <h6 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            Create Blocking Reason
          </h6>
          <BlockingReasonForm />
        </div>
      </Card>
    </div>
  );
}
