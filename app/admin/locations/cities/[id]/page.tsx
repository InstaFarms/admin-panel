import { notFound } from "next/navigation";
import { getAllBrands } from "@/actions/brandActions";
import { getLocationById, getLocationsInfo } from "@/actions/locationActions";
import RoleLocationEditPage from "../../components/RoleLocationEditPage";

interface LocationCityDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LocationCityDetailPage({
  params,
  searchParams,
}: LocationCityDetailPageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const brandId = typeof query.brandId === "string" ? query.brandId : undefined;

  const [location, brands, locationOptions] = await Promise.all([
    getLocationById(id, brandId),
    getAllBrands(["id", "name"]),
    getLocationsInfo(),
  ]);

  if (!location || !location.locationRoles?.includes("city")) {
    notFound();
  }

  return (
    <RoleLocationEditPage
      data={location}
      brands={brands}
      locationOptions={locationOptions}
      role="city"
      singularLabel="city"
      pluralLabel="Cities"
      backHref="/admin/locations/cities"
      showLocationTag
      allowedCombinations={[["city"], ["city", "destination"]]}
    />
  );
}
