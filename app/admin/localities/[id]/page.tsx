import { notFound } from "next/navigation";
import { getAllBrands } from "@/actions/brandActions";
import { getLocationById, getLocationsInfo } from "@/actions/locationActions";
import RoleLocationEditPage from "../../locations/components/RoleLocationEditPage";

interface LocalityDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LocalityDetailPage({
  params,
  searchParams,
}: LocalityDetailPageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const brandId = typeof query.brandId === "string" ? query.brandId : undefined;
  const [location, brands, locationOptions] = await Promise.all([
    getLocationById(id, brandId),
    getAllBrands(["id", "name"]),
    getLocationsInfo(),
  ]);

  if (!location || !location.locationRoles?.includes("locality")) {
    notFound();
  }

  return (
    <RoleLocationEditPage
      data={location}
      brands={brands}
      locationOptions={locationOptions}
      role="locality"
      singularLabel="locality"
      pluralLabel="Localities"
      backHref="/admin/localities"
      showLocationTag={false}
      allowedCombinations={[["locality"], ["locality", "destination"]]}
    />
  );
}
