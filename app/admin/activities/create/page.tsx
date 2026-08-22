import { Card } from "flowbite-react";
import ActivityEditor from "../[id]/ActivityEditor";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { ACTIVITIES_BREADCRUMBS, ACTIVITIES_TITLES } from "@/constants/activities";

export default async function Page() {
  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            {ACTIVITIES_TITLES.list}
          </h5>

          <PageBreadcrumb items={ACTIVITIES_BREADCRUMBS.create} className="pb-3" />
        </div>

        {/* Content container */}
        <div className="rounded-xl bg-slate-100 p-4 dark:bg-gray-900">
          <div className="mx-auto w-full max-w-md">
            <h6 className="mb-5 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              {ACTIVITIES_TITLES.create}
            </h6>
            <ActivityEditor />
          </div>
        </div>
      </Card>
    </div>
  );
}