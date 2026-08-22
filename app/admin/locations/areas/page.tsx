import RoleStyledListPage from "../../components/RoleStyledListPage";
import type { ServerPageProps } from "@/utils/types";

export const dynamic = "force-dynamic";

export default async function LocationAreasPage({ searchParams }: ServerPageProps) {
  return (
    <RoleStyledListPage
      role="area"
      label="Areas"
      singularLabel="Area"
      createHref="/admin/locations/areas/create"
      editHrefPrefix="/admin/locations/areas"
      searchParams={searchParams}
      showLocationTag={false}
      parentFilterParamKey="cityId"
    />
  );
}
