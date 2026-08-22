import { notFound } from "next/navigation";
import { getAllBrands } from "@/actions/brandActions";
import { getLocationById, getLocationsInfo } from "@/actions/locationActions";
import RoleLocationEditPage from "../../locations/components/RoleLocationEditPage";

interface DestinationDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DestinationDetailPage({
  params,
  searchParams,
}: DestinationDetailPageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const brandId = typeof query.brandId === "string" ? query.brandId : undefined;
  const [location, brands, locationOptions] = await Promise.all([
    getLocationById(id, brandId),
    getAllBrands(["id", "name"]),
    getLocationsInfo(),
  ]);

  if (!location || !location.locationRoles?.includes("destination")) {
    notFound();
  }

  return (
    <RoleLocationEditPage
      data={location}
      brands={brands}
      locationOptions={locationOptions}
      role="destination"
      singularLabel="destination"
      pluralLabel="Destinations"
      backHref="/admin/destinations"
      showLocationTag={false}
      allowedCombinations={[
        ["state", "destination"],
        ["city", "destination"],
        ["region", "destination"],
        ["area", "destination"],
        ["locality", "destination"],
      ]}
    />
  );
}
