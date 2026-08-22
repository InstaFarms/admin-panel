import { Card } from "flowbite-react";
import { ServerPageProps } from "@/utils/types";
import { getSafetyHygieneById } from "@/actions/safety-hygieneActions";
import SafetyHygieneEditor from "./SafetyHygieneEditor";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { SAFETY_HYGIENE_BREADCRUMBS, SAFETY_HYGIENE_ERRORS } from "@/constants/safetyHygiene";

export default async function Page({ params }: ServerPageProps) {
  const { id } = await params;

  const idString = Array.isArray(id) ? id[0] : (id ?? "");

  let data;
  try {
    data = await getSafetyHygieneById(idString);
  } catch (err) {
    console.error("Error fetching safety & hygiene item:", err);
    throw new Error(SAFETY_HYGIENE_ERRORS.notFound);
  }

  if (!data) {
    throw new Error(SAFETY_HYGIENE_ERRORS.notFound);
  }

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Safety & Hygiene
          </h5>

          <PageBreadcrumb items={SAFETY_HYGIENE_BREADCRUMBS.edit} />
        </div>

        <div className="mx-auto flex w-[900px] flex-col gap-5 overflow-x-auto rounded-xl bg-slate-100 p-5 dark:bg-gray-900">
          <h6 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            Edit Safety & Hygiene
          </h6>
          <SafetyHygieneEditor data={data} />
        </div>
      </Card>
    </div>
  );
}