import { getReservationDrafts } from "@/actions/bookingActions";
import Link from "next/link";
import DraftsList from "./DraftsList";

export default async function ReservationDraftsPage() {
  const result = await getReservationDrafts();
  const drafts = Array.isArray(result.success)
    ? (result.success as Array<{
        id: string;
        branchKind: string;
        status: string;
        updatedAt: string;
        payload: Record<string, unknown>;
      }>)
    : [];

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
          Reservation Drafts
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Drafts are private to the admin who created them and do not hold
          inventory.
        </p>
      </div>
      <DraftsList drafts={drafts} />
    </div>
  );
}
