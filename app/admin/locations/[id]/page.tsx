import { notFound } from "next/navigation";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { LOCATION_BREADCRUMBS } from "@/constants/locations";
import { getAllBrands } from "@/actions/brandActions";
import { getLocationById, getLocationsInfo } from "@/actions/locationActions";
import LocationEditor from "../components/LocationEditor";

interface LocationDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LocationDetailPage({
  params,
  searchParams,
}: LocationDetailPageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const brandId = typeof query.brandId === "string" ? query.brandId : undefined;

  const [location, brands, locationOptions] = await Promise.all([
    getLocationById(id, brandId),
    getAllBrands(["id", "name"]),
    getLocationsInfo(),
  ]);

  if (!location) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb items={LOCATION_BREADCRUMBS.edit(location.name || "Location")} />
      <LocationEditor data={location} brands={brands} locationOptions={locationOptions} />
    </div>
  );
}
