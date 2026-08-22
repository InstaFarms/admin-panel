import { getAllBrands } from "@/actions/brandActions";
import { getLocationsInfo } from "@/actions/locationActions";
import RoleLocationWizard from "../../components/RoleLocationWizard";

export default async function CreateLocationAreaPage() {
  const [brands, locationOptions] = await Promise.all([
    getAllBrands(["id", "name"]),
    getLocationsInfo(),
  ]);

  return (
    <RoleLocationWizard
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
