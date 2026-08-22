import PageBreadcrumb from "@/components/PageBreadcrumb";
import { LOCATION_BREADCRUMBS } from "@/constants/locations";
import { getAllBrands } from "@/actions/brandActions";
import { getLocationsInfo } from "@/actions/locationActions";
import LocationEditor from "../components/LocationEditor";

export default async function CreateLocationPage() {
  const [brands, locationOptions] = await Promise.all([
    getAllBrands(["id", "name"]),
    getLocationsInfo(),
  ]);

  return (
    <div className="space-y-6">
      <PageBreadcrumb items={LOCATION_BREADCRUMBS.create} />
      <LocationEditor brands={brands} locationOptions={locationOptions} />
    </div>
  );
}
