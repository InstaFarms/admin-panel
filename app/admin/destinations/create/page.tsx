import { getAllBrands } from "@/actions/brandActions";
import { getLocationsInfo } from "@/actions/locationActions";
import RoleLocationWizard from "../../locations/components/RoleLocationWizard";

export default async function CreateDestinationPage() {
  const [brands, locationOptions] = await Promise.all([
    getAllBrands(["id", "name"]),
    getLocationsInfo(),
  ]);

  return (
    <RoleLocationWizard
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
