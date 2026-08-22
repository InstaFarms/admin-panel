import { Card } from "flowbite-react";
import SafetyHygieneEditor from "../[id]/SafetyHygieneEditor";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { SAFETY_HYGIENE_BREADCRUMBS } from "@/constants/safetyHygiene";

export default async function Page() {
  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Safety & Hygiene
          </h5>

          <PageBreadcrumb items={SAFETY_HYGIENE_BREADCRUMBS.create} />
        </div>

        <div className="mx-auto flex w-[900px] flex-col gap-5 overflow-x-auto rounded-xl bg-slate-100 p-5 dark:bg-gray-900">
          <h6 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            Create New Safety & Hygiene
          </h6>
          <SafetyHygieneEditor />
        </div>
      </Card>
    </div>
  );
}
