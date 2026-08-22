import { getAllBrands } from "@/actions/brandActions";
import { getLocationsInfo } from "@/actions/locationActions";
import RoleLocationWizard from "../../locations/components/RoleLocationWizard";

export default async function CreateLocalityPage() {
  const [brands, locationOptions] = await Promise.all([
    getAllBrands(["id", "name"]),
    getLocationsInfo(),
  ]);

  return (
    <RoleLocationWizard
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
