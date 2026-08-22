"use client";

import {
  createReservationEnquiry,
  saveReservationDraft,
} from "@/actions/bookingActions";
import PropertySelector from "@/components/PropertySelector";
import { parseServerActionResult } from "@/utils/utils";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";

const fieldClass =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-teal-500 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

export default function CreateReservationEnquiryEditor({
  brands,
  initialDraft,
}: {
  brands: Array<{ id: string; name: string }>;
  initialDraft?: { id: string; payload: Record<string, unknown> };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const draftPayload = initialDraft?.payload ?? {};
  const asText = (key: string) => String(draftPayload[key] ?? "");
  const [draftId, setDraftId] = useState(initialDraft?.id);
  const [brandId, setBrandId] = useState(asText("brandId"));
  const [suggestionId, setSuggestionId] = useState<string | null>(null);
  const [suggestedProperties, setSuggestedProperties] = useState<
    Array<{ propertyId: string }>
  >(
    Array.isArray(draftPayload.suggestedProperties)
      ? (draftPayload.suggestedProperties as Array<{ propertyId: string }>)
      : [],
  );
  const [guestName, setGuestName] = useState(asText("guestName"));
  const [email, setEmail] = useState(asText("email"));
  const [mobile, setMobile] = useState(asText("mobile"));
  const [guestCount, setGuestCount] = useState(asText("guestCount"));
  const [checkinDate, setCheckinDate] = useState(asText("checkinDate"));
  const [checkoutDate, setCheckoutDate] = useState(asText("checkoutDate"));
  const [requirements, setRequirements] = useState(asText("requirements"));
  const [followUpNote, setFollowUpNote] = useState(asText("followUpNote"));

  const addSuggestion = () => {
    if (!suggestionId) return;
    setSuggestedProperties((current) =>
      current.some((item) => item.propertyId === suggestionId)
        ? current
        : [...current, { propertyId: suggestionId }],
    );
    setSuggestionId(null);
  };

  const submit = () => {
    if (
      !brandId ||
      !guestName.trim() ||
      !email.trim() ||
      !requirements.trim()
    ) {
      toast.error("Brand, guest name, email and requirements are required");
      return;
    }
    if ((checkinDate && !checkoutDate) || (!checkinDate && checkoutDate)) {
      toast.error("Select both check-in and check-out dates");
      return;
    }
    const formData = new FormData();
    for (const [key, value] of Object.entries({
      brandId,
      guestName: guestName.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      guestCount,
      checkinDate,
      checkoutDate,
      requirements: requirements.trim(),
      followUpNote: followUpNote.trim(),
    })) {
      formData.set(key, value);
    }
    formData.set("suggestedProperties", JSON.stringify(suggestedProperties));
    if (draftId) formData.set("reservationDraftId", draftId);
    startTransition(() => {
      toast.promise(
        parseServerActionResult(createReservationEnquiry(formData)),
        {
          loading: "Creating enquiry...",
          success: (message) => {
            router.push("/admin/requests/enquiries");
            return message;
          },
          error: (error) => (error as Error).message,
        },
      );
    });
  };

  const saveDraft = () => {
    startTransition(async () => {
      const result = await saveReservationDraft({
        draftId,
        brandId: brandId || null,
        branchKind: "ENQUIRY",
        payload: {
          brandId,
          guestName,
          email,
          mobile,
          guestCount,
          checkinDate,
          checkoutDate,
          requirements,
          followUpNote,
          suggestedProperties,
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
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-100">
        This creates a follow-up lead only. It will not reserve inventory or
        create a booking.
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Brand *
          <select
            className={fieldClass}
            value={brandId}
            onChange={(event) => {
              setBrandId(event.target.value);
              setSuggestionId(null);
              setSuggestedProperties([]);
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
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Guest name *
          <input
            className={fieldClass}
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Email *
          <input
            className={fieldClass}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Mobile
          <input
            className={fieldClass}
            inputMode="tel"
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Guest count
          <input
            className={fieldClass}
            type="number"
            min="1"
            value={guestCount}
            onChange={(event) => setGuestCount(event.target.value)}
          />
        </label>
        <div />
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Preferred check-in
          <input
            className={fieldClass}
            type="date"
            value={checkinDate}
            onChange={(event) => setCheckinDate(event.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Preferred check-out
          <input
            className={fieldClass}
            type="date"
            min={checkinDate || undefined}
            value={checkoutDate}
            onChange={(event) => setCheckoutDate(event.target.value)}
          />
        </label>
      </div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        Requirements *
        <textarea
          className={fieldClass}
          rows={4}
          value={requirements}
          onChange={(event) => setRequirements(event.target.value)}
          placeholder="Stay, event or customised-request requirements"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        Follow-up note
        <textarea
          className={fieldClass}
          rows={3}
          value={followUpNote}
          onChange={(event) => setFollowUpNote(event.target.value)}
          placeholder="Next action for the reservation executive"
        />
      </label>
      <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          Suggested properties
        </p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <PropertySelector
              propertyId={suggestionId}
              update={setSuggestionId}
              readOnly={!brandId}
              brandId={brandId}
            />
          </div>
          <button
            type="button"
            onClick={addSuggestion}
            disabled={!suggestionId}
            className="rounded-lg border border-teal-600 px-4 py-2 text-sm font-semibold text-teal-700 disabled:opacity-50 dark:text-teal-300"
          >
            Add suggestion
          </button>
        </div>
        {suggestedProperties.length ? (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {suggestedProperties.length} property suggestion
            {suggestedProperties.length === 1 ? "" : "s"} added.
          </p>
        ) : null}
      </div>
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
          className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {isPending ? "Creating..." : "Create Booking Enquiry"}
        </button>
      </div>
    </div>
  );
}
