import { getLocationsInfo } from "@/actions/locationActions";
import CreateLocationLandmarkWizard from "../../components/CreateLocationLandmarkWizard";

export default async function CreateLocationLandmarkPage() {
  const locationOptions = await getLocationsInfo();

  return <CreateLocationLandmarkWizard locationOptions={locationOptions} />;
}
