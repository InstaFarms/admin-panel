import { notFound } from "next/navigation";
import { getAllBrands } from "@/actions/brandActions";
import { getLocationById, getLocationsInfo } from "@/actions/locationActions";
import RoleLocationEditPage from "../../locations/components/RoleLocationEditPage";

interface RegionDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RegionDetailPage({
  params,
  searchParams,
}: RegionDetailPageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const brandId = typeof query.brandId === "string" ? query.brandId : undefined;
  const [location, brands, locationOptions] = await Promise.all([
    getLocationById(id, brandId),
    getAllBrands(["id", "name"]),
    getLocationsInfo(),
  ]);

  if (!location || !location.locationRoles?.includes("region")) {
    notFound();
  }

  return (
    <RoleLocationEditPage
      data={location}
      brands={brands}
      locationOptions={locationOptions}
      role="region"
      singularLabel="region"
      pluralLabel="Regions"
      backHref="/admin/regions"
      showLocationTag={false}
      allowedCombinations={[["region"], ["region", "destination"]]}
    />
  );
}
