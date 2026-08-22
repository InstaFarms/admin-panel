import { Card } from "flowbite-react";
import { ServerPageProps } from "@/utils/types";
import { getAmenityById } from "@/actions/amenityActions";
import AmenityEditor from "@/app/admin/amenities/[id]/AmenityEditor";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { AMENITIES_BREADCRUMBS, AMENITIES_TITLES, AMENITIES_ERRORS } from "@/constants/amenities";

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

  let amenity;
  let error: string | null = null;

  try {
    amenity = await getAmenityById(idString);
  } catch (err) {
    console.error("Error fetching amenity:", err);
    error = err instanceof Error ? err.message : AMENITIES_ERRORS.fetchAmenityFailed;
  }

  if (!amenity) {
    throw new Error(error || AMENITIES_ERRORS.notFound);
  }

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            {AMENITIES_TITLES.list}
          </h5>

          <PageBreadcrumb items={AMENITIES_BREADCRUMBS.edit} className="pb-3" />
        </div>

        {/* Responsive form container */}
        <div className="w-full max-w-2xl mx-auto rounded-xl bg-slate-100 p-4 sm:p-6 lg:p-8 dark:bg-gray-900">
          <h6 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white mb-6">
            {AMENITIES_TITLES.edit}
          </h6>
          <AmenityEditor data={amenity} />
        </div>
      </Card>
    </div>
  );
}