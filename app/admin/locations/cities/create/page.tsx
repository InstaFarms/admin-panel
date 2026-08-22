import { getAllBrands } from "@/actions/brandActions";
import { getLocationsInfo } from "@/actions/locationActions";
import RoleLocationWizard from "../../components/RoleLocationWizard";

export default async function CreateLocationCityPage() {
  const [brands, locationOptions] = await Promise.all([
    getAllBrands(["id", "name"]),
    getLocationsInfo(),
  ]);

  return (
    <RoleLocationWizard
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
