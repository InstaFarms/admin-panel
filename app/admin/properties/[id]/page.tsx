import PropertyEditor from "@/components/properties/editor/PropertyEditor";
import { normalizeSingleRouteParam } from "@/lib/routeParamUtils";
import { getAllBrands } from "@/actions/brandActions";
// Force dynamic rendering to prevent any caching issues
export const dynamic = "force-dynamic";

type PropertyPageParams = {
  id?: string | string[];
};
type BrandOption = { id: string; name: string };

export default async function Page({
  params,
}: {
  params: Promise<PropertyPageParams>;
}) {
  const resolved = await params;
  const idString = normalizeSingleRouteParam(resolved?.id);
  const rawBrands = await getAllBrands(["id", "name"]);
  const brands: BrandOption[] = (rawBrands ?? [])
    .filter((brand: any) => brand?.id && brand?.name)
    .map((brand: any) => ({ id: String(brand.id), name: String(brand.name) }));

  return (
    <div className="flex w-full flex-col">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex w-full flex-col overflow-visible">
          <PropertyEditor
            propertyId={idString || undefined}
            brands={brands ?? []}
          />
        </div>
      </div>
    </div>
  );
}
