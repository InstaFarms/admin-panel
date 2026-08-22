import { getAllBrands } from "@/actions/brandActions";
import { getLocationsInfo } from "@/actions/locationActions";
import RoleLocationWizard from "../../locations/components/RoleLocationWizard";

export default async function CreateRegionPage() {
  const [brands, locationOptions] = await Promise.all([
    getAllBrands(["id", "name"]),
    getLocationsInfo(),
  ]);

  return (
    <RoleLocationWizard
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
