import { Card } from "flowbite-react";

import PageBreadcrumb from "@/components/PageBreadcrumb";
import { BREADCRUMBS } from "@/constants/propertyTypes";
import PropertyTypeEditor from "../[id]/PropertyTypeEditor";

export default async function Page() {
  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Property Types
          </h5>
          <PageBreadcrumb items={BREADCRUMBS.create} className="pb-3" />
        </div>

        <div className="w-full max-w-2xl mx-auto rounded-xl bg-slate-100 p-4 sm:p-6 lg:p-8 dark:bg-gray-900">
          <h6 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
            Create New Property Type
          </h6>
          <PropertyTypeEditor />
        </div>
      </Card>
    </div>
  );
}