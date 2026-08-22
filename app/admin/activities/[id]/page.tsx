import { Card } from "flowbite-react";
import { ServerPageProps } from "@/utils/types";
import { getActivityById } from "@/actions/activityActions";
import ActivityEditor from "./ActivityEditor";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { ACTIVITIES_BREADCRUMBS, ACTIVITIES_TITLES, ACTIVITIES_ERRORS } from "@/constants/activities";

export default async function Page({ params }: ServerPageProps) {
  const { id } = await params;

  // Extract ID from params
  let idString = "";
  if (id === undefined) {
    idString = "";
  } else if (typeof id === "string") {
    idString = id;
  } else {
    idString = id[0];
  }
  
  let data;
  let error: string | null = null;

  try {
    data = await getActivityById(idString);
  } catch (err) {
    console.error("Error fetching activity:", err);
    error = err instanceof Error ? err.message : ACTIVITIES_ERRORS.fetchActivityFailed;
  }

  if (!data) {
    throw new Error(error || ACTIVITIES_ERRORS.notFound);
  }

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            {ACTIVITIES_TITLES.list}
          </h5>

          <PageBreadcrumb items={ACTIVITIES_BREADCRUMBS.edit} className="pb-3" />
        </div>

        {/* Content container */}
        <div className="rounded-xl bg-slate-100 p-4 dark:bg-gray-900">
          <div className="mx-auto w-full max-w-md">
            <h6 className="mb-5 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              {ACTIVITIES_TITLES.edit}
            </h6>
            <ActivityEditor data={data} />
          </div>
        </div>
      </Card>
    </div>
  );
}