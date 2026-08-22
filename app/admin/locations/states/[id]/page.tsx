import { notFound } from "next/navigation";
import { getAllBrands } from "@/actions/brandActions";
import { getLocationById, getLocationsInfo } from "@/actions/locationActions";
import StateEditPage from "./StateEditPage";

interface LocationStateDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LocationStateDetailPage({
  params,
  searchParams,
}: LocationStateDetailPageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const brandId = typeof query.brandId === "string" ? query.brandId : undefined;

  const [location, brands, locationOptions] = await Promise.all([
    getLocationById(id, brandId),
    getAllBrands(["id", "name"]),
    getLocationsInfo(),
  ]);

  if (!location || !location.locationRoles?.includes("state")) {
    notFound();
  }

  return (
    <StateEditPage
      data={location}
      brands={brands}
      stateOptions={locationOptions}
    />
  );
}
