import { notFound } from "next/navigation";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { LOCATION_BREADCRUMBS } from "@/constants/locations";
import {
  getLocationLandmarkById,
  getLocationsInfo,
} from "@/actions/locationActions";
import LocationLandmarkEditor from "../../components/LocationLandmarkEditor";

interface LocationLandmarkDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LocationLandmarkDetailPage({
  params,
}: LocationLandmarkDetailPageProps) {
  const { id } = await params;
  const [landmark, locationOptions] = await Promise.all([
    getLocationLandmarkById(id),
    getLocationsInfo(),
  ]);

  if (!landmark) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb
        items={LOCATION_BREADCRUMBS.editLandmark(landmark.landmark || "Landmark")}
      />
      <LocationLandmarkEditor data={landmark} locationOptions={locationOptions} />
    </div>
  );
}
