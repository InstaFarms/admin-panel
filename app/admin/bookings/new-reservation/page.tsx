import { getAllBrands } from "@/actions/brandActions";
import { getCommissionBookingSources } from "@/actions/sourceCommissionActions";
import { getReservationDraft } from "@/actions/bookingActions";
import CreateBookingWizard from "@/components/bookings/wizard/CreateBookingWizard";
import type { WizardBrand, WizardCommissionSource } from "@/components/bookings/wizard/types";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ draftId?: string }>;
}) {
  const { draftId } = await searchParams;

  const [brandsRaw, sourcesResult, draftResult] = await Promise.all([
    getAllBrands(["id", "name"]),
    getCommissionBookingSources({ limit: 100, status: "ACTIVE" }),
    draftId ? getReservationDraft(draftId) : Promise.resolve(null),
  ]);

  const brands: WizardBrand[] = Array.isArray(brandsRaw)
    ? brandsRaw
        .filter((brand: any) => brand?.id && brand?.name)
        .map((brand: any) => ({ id: String(brand.id), name: String(brand.name) }))
    : [];

  const commissionSources: WizardCommissionSource[] = Array.isArray(sourcesResult?.data)
    ? sourcesResult.data.map((s) => ({
        id: s.id,
        sourceName: s.sourceName,
        sourceCode: s.sourceCode,
        description: s.description,
      }))
    : [];

  const draft = draftResult && "success" in draftResult ? draftResult.success : null;

  return (
    <CreateBookingWizard
      brands={brands}
      commissionSources={commissionSources}
      draftId={draftId || null}
      draftPayload={draft && typeof draft === "object" ? (draft as any).payload ?? null : null}
    />
  );
}
