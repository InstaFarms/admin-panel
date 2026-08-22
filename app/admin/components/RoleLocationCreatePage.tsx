import PageBreadcrumb from "@/components/PageBreadcrumb";
import { getAllBrands } from "@/actions/brandActions";
import { getLocationsInfo } from "@/actions/locationActions";
import type { BreadcrumbItemConfig } from "@/components/PageBreadcrumb";
import type { LocationRole } from "@/types/locations";
import LocationEditor from "../locations/components/LocationEditor";

interface RoleLocationCreatePageProps {
  role: LocationRole;
  breadcrumbs: BreadcrumbItemConfig[];
  showLocationTag?: boolean;
  title?: string;
  description?: string;
  heroClassName?: string;
  hideParentSelector?: boolean;
}

export default async function RoleLocationCreatePage({
  role,
  breadcrumbs,
  showLocationTag,
  title,
  description,
  heroClassName,
  hideParentSelector,
}: RoleLocationCreatePageProps) {
  const [brands, locationOptions] = await Promise.all([
    getAllBrands(["id", "name"]),
    getLocationsInfo(),
  ]);

  return (
    <div className="flex w-full flex-col">
      <div
        className={
          heroClassName ??
          "w-full rounded-3xl border border-slate-700 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_28%),linear-gradient(180deg,#0f172a_0%,#0b1326_100%)] p-4 sm:p-6 xl:p-8"
        }
      >
        <PageBreadcrumb
          items={breadcrumbs}
          className="pb-3 text-slate-300/80"
        />
        <div className="flex flex-col gap-5">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-white">
              {title ?? `Create New ${role.charAt(0).toUpperCase()}${role.slice(1)}`}
            </h1>
            <p className="text-sm text-slate-300">
              {description ??
                "Add the base location first. Brand-specific content can be configured later from the edit page."}
            </p>
          </div>
          <LocationEditor
            brands={brands}
            locationOptions={locationOptions}
            lockedRoles={[role]}
            showLocationTag={showLocationTag}
            hideParentSelector={hideParentSelector}
            createContextLabel={title ?? `Create ${role}`}
            createContextDescription={description}
          />
        </div>
      </div>
    </div>
  );
}
