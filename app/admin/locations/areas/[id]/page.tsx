import { notFound } from "next/navigation";
import { getAllBrands } from "@/actions/brandActions";
import { getLocationById, getLocationsInfo } from "@/actions/locationActions";
import RoleLocationEditPage from "../../components/RoleLocationEditPage";

interface LocationAreaDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LocationAreaDetailPage({
  params,
  searchParams,
}: LocationAreaDetailPageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const brandId = typeof query.brandId === "string" ? query.brandId : undefined;

  const [location, brands, locationOptions] = await Promise.all([
    getLocationById(id, brandId),
    getAllBrands(["id", "name"]),
    getLocationsInfo(),
  ]);

  if (!location || !location.locationRoles?.includes("area")) {
    notFound();
  }

  return (
    <RoleLocationEditPage
      data={location}
      brands={brands}
      locationOptions={locationOptions}
      role="area"
      singularLabel="area"
      pluralLabel="Areas"
      backHref="/admin/locations/areas"
      showLocationTag={false}
      allowedCombinations={[["area"], ["area", "destination"], ["area", "locality"]]}
    />
  );
}
