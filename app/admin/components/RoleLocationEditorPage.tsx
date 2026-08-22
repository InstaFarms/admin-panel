import { notFound } from "next/navigation";
import { getAllBrands } from "@/actions/brandActions";
import { getLocationById, getLocationsInfo } from "@/actions/locationActions";
import type { BreadcrumbItemConfig } from "@/components/PageBreadcrumb";
import type { LocationRole } from "@/types/locations";
import LocationEditor from "../locations/components/LocationEditor";

interface RoleLocationEditorPageProps {
  role: LocationRole;
  breadcrumbs: (label: string) => BreadcrumbItemConfig[];
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
  showLocationTag?: boolean;
}

export default async function RoleLocationEditorPage({
  role,
  breadcrumbs,
  params,
  searchParams,
  showLocationTag,
}: RoleLocationEditorPageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const brandId = typeof query.brandId === "string" ? query.brandId : undefined;

  const [location, brands, locationOptions] = await Promise.all([
    getLocationById(id, brandId),
    getAllBrands(["id", "name"]),
    getLocationsInfo(),
  ]);

  if (!location || !location.locationRoles?.includes(role)) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <LocationEditor
        data={location}
        brands={brands}
        locationOptions={locationOptions}
        showLocationTag={showLocationTag}
        breadcrumbItems={breadcrumbs(location.name || "Location")}
      />
    </div>
  );
}
