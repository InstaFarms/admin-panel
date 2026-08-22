import { getAllBrands } from "@/actions/brandActions";
import { getReservationDraft } from "@/actions/bookingActions";
import CreateReservationEnquiryEditor from "@/components/bookings/reservations/CreateReservationEnquiryEditor";
import Link from "next/link";

export default async function CreateReservationEnquiryPage({
  searchParams,
}: {
  searchParams?: Promise<{ draftId?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const brandsRaw = await getAllBrands(["id", "name"]);
  const brands = Array.isArray(brandsRaw)
    ? brandsRaw
        .filter((brand: any) => brand?.id && brand?.name)
        .map((brand: any) => ({
          id: String(brand.id),
          name: String(brand.name),
        }))
    : [];
  const draftResult = params.draftId
    ? await getReservationDraft(params.draftId)
    : null;
  const draft =
    draftResult?.success && typeof draftResult.success === "object"
      ? (draftResult.success as {
          id?: string;
          branchKind?: string;
          status?: string;
          payload?: Record<string, unknown>;
        })
      : null;
  const initialDraft =
    draft?.branchKind === "ENQUIRY" &&
    draft.status === "DRAFT" &&
    draft.id &&
    draft.payload
      ? { id: draft.id, payload: draft.payload }
      : undefined;
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div>
        <Link
          href="/admin/bookings/create"
          className="text-sm text-teal-700 hover:underline dark:text-teal-300"
        >
          Back to reservation desk
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
          Create Booking Enquiry
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Capture the lead and suggested properties without blocking dates.
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <CreateReservationEnquiryEditor
          brands={brands}
          initialDraft={initialDraft}
        />
      </div>
    </div>
  );
}
