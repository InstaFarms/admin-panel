import RoleStyledListPage from "../components/RoleStyledListPage";
import type { ServerPageProps } from "@/utils/types";

export const dynamic = "force-dynamic";

export default async function LocalitiesPage({ searchParams }: ServerPageProps) {
  return (
    <RoleStyledListPage
      role="locality"
      label="Localities"
      singularLabel="Locality"
      createHref="/admin/localities/create"
      editHrefPrefix="/admin/localities"
      searchParams={searchParams}
      showLocationTag={false}
    />
  );
}
