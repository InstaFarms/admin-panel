import { getAllBrands } from "@/actions/brandActions";
import { fetchAccommodationGstConfig } from "@/actions/taxConfigurationActions";
import AccommodationGstConfigForm from "@/components/settings/AccommodationGstConfigForm";

export const dynamic = "force-dynamic";

export default async function TaxConfigurationPage() {
  const [brandsRaw, globalConfig] = await Promise.all([
    getAllBrands(["id", "name"]),
    fetchAccommodationGstConfig(null),
  ]);

  const brands: { id: string; name: string }[] = Array.isArray(brandsRaw)
    ? brandsRaw.map((b: any) => ({ id: b.id, name: b.name }))
    : [];

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-white">
        Accommodation GST Configuration
      </h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        The nightly value-of-supply boundary and GST percentages used to tax
        every booking. Changes are append-only and effective-dated — a past
        booking is never recomputed against a later change.
      </p>
      <AccommodationGstConfigForm
        brands={brands}
        initialGlobalPolicy={globalConfig.success ? globalConfig.policy : null}
        initialGlobalHistory={globalConfig.success ? globalConfig.history : []}
      />
    </div>
  );
}
