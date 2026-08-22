"use client";

import {
  createOwnerReservation,
  saveReservationDraft,
} from "@/actions/bookingActions";
import PropertySelector from "@/components/PropertySelector";
import OwnerPicker from "./OwnerPicker";
import { parseServerActionResult } from "@/utils/utils";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";

type Brand = { id: string; name: string };
type Owner = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

const fieldClass =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-teal-500 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

export default function CreateOwnerReservationEditor({
  brands,
  owners,
  initialDraft,
}: {
  brands: Brand[];
  owners: Owner[];
  initialDraft?: { id: string; payload: Record<string, unknown> };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const draftPayload = initialDraft?.payload ?? {};
  const asText = (key: string) => String(draftPayload[key] ?? "");
  const [draftId, setDraftId] = useState(initialDraft?.id);
  const [brandId, setBrandId] = useState(asText("brandId"));
  const [propertyId, setPropertyId] = useState<string | null>(
    asText("propertyId") || null,
  );
  const [ownerId, setOwnerId] = useState(asText("ownerId"));
  const [stayType, setStayType] = useState<"SELF" | "GUEST">(
    draftPayload.stayType === "GUEST" ? "GUEST" : "SELF",
  );
  const [guestName, setGuestName] = useState(asText("guestName"));
  const [guestMobile, setGuestMobile] = useState(asText("guestMobile"));
  const [guestCount, setGuestCount] = useState(asText("guestCount"));
  const [bookingAmount, setBookingAmount] = useState(asText("bookingAmount"));
  const [advanceAmount, setAdvanceAmount] = useState(asText("advanceAmount"));
  const [checkinDate, setCheckinDate] = useState(asText("checkinDate"));
  const [checkoutDate, setCheckoutDate] = useState(asText("checkoutDate"));
  const [internalNotes, setInternalNotes] = useState(asText("internalNotes"));
  const bookingAmountValue = Number(bookingAmount || 0);
  const advanceAmountValue = Number(advanceAmount || 0);
  const outstandingAmount =
    Number.isFinite(bookingAmountValue) && Number.isFinite(advanceAmountValue)
      ? Math.max(0, bookingAmountValue - advanceAmountValue)
      : 0;

  const submit = () => {
    if (!brandId || !propertyId || !ownerId || !checkinDate || !checkoutDate) {
      toast.error("Brand, property, owner and stay dates are required");
      return;
    }
    if (
      stayType === "GUEST" &&
      (!guestName.trim() || !guestMobile.trim() || !guestCount)
    ) {
      toast.error("Guest name, mobile and guest count are required");
      return;
    }

    const formData = new FormData();
    formData.set("brandId", brandId);
    formData.set("propertyId", propertyId);
    formData.set("ownerId", ownerId);
    formData.set("startDate", checkinDate);
    formData.set("endDate", checkoutDate);
    formData.set("ownerStayType", stayType);
    formData.set("guestName", guestName.trim());
    formData.set("guestMobile", guestMobile.trim());
    formData.set("guestCount", guestCount);
    formData.set("bookingAmount", bookingAmount || "0");
    formData.set("advanceAmount", advanceAmount || "0");
    formData.set("internalNotes", internalNotes.trim());
    if (draftId) formData.set("reservationDraftId", draftId);

    startTransition(() => {
      toast.promise(parseServerActionResult(createOwnerReservation(formData)), {
        loading: "Creating owner reservation...",
        success: (message) => {
          router.push("/admin/bookings/blocking");
          return message;
        },
        error: (error) => (error as Error).message,
      });
    });
  };

  const saveDraft = () => {
    startTransition(async () => {
      const result = await saveReservationDraft({
        draftId,
        brandId: brandId || null,
        branchKind: "OWNER",
        payload: {
          brandId,
          propertyId,
          ownerId,
          stayType,
          guestName,
          guestMobile,
          guestCount,
          bookingAmount,
          advanceAmount,
          checkinDate,
          checkoutDate,
          internalNotes,
        },
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const nextDraftId = (result.data as { id?: string } | undefined)?.id;
      if (nextDraftId) setDraftId(nextDraftId);
      toast.success("Reservation draft saved");
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
        This creates inventory only. No customer booking, payment, GST,
        commission, settlement or milestone record is created.
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Brand *
          <select
            className={fieldClass}
            value={brandId}
            onChange={(event) => {
              setBrandId(event.target.value);
              setPropertyId(null);
            }}
          >
            <option value="">Select brand</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
          <OwnerPicker
            id="reservation-owner"
            owners={owners}
            value={ownerId}
            onChange={setOwnerId}
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Property *
        </p>
        <div className="mt-1">
          <PropertySelector
            propertyId={propertyId}
            update={setPropertyId}
            readOnly={!brandId}
            brandId={brandId}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Check-in *
          <input
            className={fieldClass}
            type="date"
            value={checkinDate}
            onChange={(event) => setCheckinDate(event.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Check-out *
          <input
            className={fieldClass}
            type="date"
            value={checkoutDate}
            min={checkinDate || undefined}
            onChange={(event) => setCheckoutDate(event.target.value)}
          />
        </label>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Stay type *
        </legend>
        <div className="mt-2 flex gap-3">
          {(["SELF", "GUEST"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setStayType(type)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${stayType === type ? "border-teal-600 bg-teal-600 text-white" : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"}`}
            >
              {type === "SELF" ? "Owner Self Stay" : "Owner Guest Stay"}
            </button>
          ))}
        </div>
      </fieldset>

      {stayType === "GUEST" ? (
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Guest details
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Guest name *
              <input
                className={fieldClass}
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Mobile *
              <input
                className={fieldClass}
                inputMode="tel"
                value={guestMobile}
                onChange={(event) => setGuestMobile(event.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Guest count *
              <input
                className={fieldClass}
                type="number"
                min="1"
                value={guestCount}
                onChange={(event) => setGuestCount(event.target.value)}
              />
            </label>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Booking amount
              <input
                className={fieldClass}
                type="number"
                min="0"
                value={bookingAmount}
                onChange={(event) => setBookingAmount(event.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Advance collected
              <input
                className={fieldClass}
                type="number"
                min="0"
                value={advanceAmount}
                onChange={(event) => setAdvanceAmount(event.target.value)}
              />
            </label>
          </div>
          <div className="mt-4 rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-100">
            Outstanding: Rs {outstandingAmount.toLocaleString("en-IN")}
          </div>
        </div>
      ) : null}

      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        Internal notes
        <textarea
          className={fieldClass}
          rows={3}
          value={internalNotes}
          onChange={(event) => setInternalNotes(event.target.value)}
          placeholder="Operational context for this owner stay"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={saveDraft}
          disabled={isPending}
          className="rounded-lg border border-teal-600 px-5 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-60 dark:text-teal-300 dark:hover:bg-teal-950/30"
        >
          {isPending ? "Saving..." : "Save Draft"}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Creating..." : "Create Owner Reservation"}
        </button>
      </div>
    </div>
  );
}
