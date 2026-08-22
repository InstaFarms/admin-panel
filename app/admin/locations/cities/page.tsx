import RoleStyledListPage from "../../components/RoleStyledListPage";
import type { ServerPageProps } from "@/utils/types";

export const dynamic = "force-dynamic";

export default async function LocationCitiesPage({ searchParams }: ServerPageProps) {
  return (
    <RoleStyledListPage
      role="city"
      label="Cities"
      singularLabel="City"
      createHref="/admin/locations/cities/create"
      editHrefPrefix="/admin/locations/cities"
      searchParams={searchParams}
      childListHrefPrefix="/admin/locations/areas"
      childParamKey="cityId"
      parentFilterParamKey="stateId"
    />
  );
}
