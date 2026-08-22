import RoleStyledListPage from "../components/RoleStyledListPage";
import type { ServerPageProps } from "@/utils/types";

export const dynamic = "force-dynamic";

export default async function DestinationsPage({ searchParams }: ServerPageProps) {
  return (
    <RoleStyledListPage
      role="destination"
      label="Destinations"
      singularLabel="Destination"
      createHref="/admin/destinations/create"
      editHrefPrefix="/admin/destinations"
      searchParams={searchParams}
      showLocationTag={false}
    />
  );
}
