import RoleStyledListPage from "../components/RoleStyledListPage";
import type { ServerPageProps } from "@/utils/types";

export const dynamic = "force-dynamic";

export default async function RegionsPage({ searchParams }: ServerPageProps) {
  return (
    <RoleStyledListPage
      role="region"
      label="Regions"
      singularLabel="Region"
      createHref="/admin/regions/create"
      editHrefPrefix="/admin/regions"
      searchParams={searchParams}
      showLocationTag={false}
    />
  );
}
