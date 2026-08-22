import CreateStateWizard from "./CreateStateWizard";
import { getAllBrands } from "@/actions/brandActions";
import { getLocationsInfo } from "@/actions/locationActions";

export default async function CreateLocationStatePage() {
  const [brands, stateOptions] = await Promise.all([
    getAllBrands(["id", "name"]),
    getLocationsInfo(),
  ]);

  return (
    <CreateStateWizard brands={brands} stateOptions={stateOptions} />
  );
}
