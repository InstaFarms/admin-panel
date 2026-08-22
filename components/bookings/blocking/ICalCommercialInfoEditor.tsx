"use client";

import { updateICalBlockingCommercialInfo } from "@/actions/bookingActions";
import CustomerSelector from "@/components/CustomerSelector";
import { useTransition, useState } from "react";
import toast from "react-hot-toast";

interface Props {
  blockingId: string;
  brandName?: string | null;
  otaName?: string | null;
  initialCustomerId: string | null;
  initialIcalBookingAmountWithGst: number | null;
  initialIcalBookingGst: number | null;
  initialIcalNetBookingAmount: number | null;
  initialIcalOtaCommission: number | null;
}

function toNum(val: string): number | null {
  const n = parseFloat(val);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function inr(val: number | null): string {
  if (val == null) return "—";
  return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {label}
      </span>
      {children}
      <span className="text-xs text-gray-400 dark:text-gray-500">{hint}</span>
    </div>
  );
}

function MoneyInput({
  id,
  value,
  onChange,
  placeholder,
  readOnly,
}: {
  id?: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <div
      className={`group flex items-stretch overflow-hidden rounded-xl border transition-colors ${
        readOnly
          ? "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60"
          : "border-gray-300 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:focus-within:border-indigo-400"
      }`}
    >
      <div
        className={`flex items-center px-3.5 text-sm font-semibold ${
          readOnly
            ? "text-gray-400 dark:text-gray-500"
            : "text-gray-500 dark:text-gray-400"
        }`}
      >
        ₹
      </div>
      <div className="w-px self-stretch bg-gray-200 dark:bg-gray-700" />
      <input
        id={id}
        type={readOnly ? "text" : "number"}
        min={0}
        step="0.01"
        value={value}
        onChange={readOnly ? undefined : (e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`h-11 w-full bg-transparent px-3.5 text-sm outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600 ${
          readOnly
            ? "cursor-default text-gray-500 dark:text-gray-400"
            : "text-gray-900 dark:text-white"
        }`}
      />
      {readOnly && (
        <div className="flex items-center pr-3.5">
          <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-500 dark:bg-indigo-900/40 dark:text-indigo-400">
            Auto
          </span>
        </div>
      )}
    </div>
  );
}

export default function ICalCommercialInfoEditor({
  blockingId,
  brandName,
  otaName,
  initialCustomerId,
  initialIcalBookingAmountWithGst,
  initialIcalBookingGst,
  initialIcalNetBookingAmount,
  initialIcalOtaCommission,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const [customerId, setCustomerId] = useState<string | null>(initialCustomerId);
  const [amountWithGst, setAmountWithGst] = useState(
    initialIcalBookingAmountWithGst != null ? String(initialIcalBookingAmountWithGst) : ""
  );
  const [bookingGst, setBookingGst] = useState(
    initialIcalBookingGst != null ? String(initialIcalBookingGst) : ""
  );
  const [otaCommission, setOtaCommission] = useState(
    initialIcalOtaCommission != null ? String(initialIcalOtaCommission) : ""
  );

  const parsedAmount = toNum(amountWithGst);
  const parsedGst = toNum(bookingGst);
  const parsedCommission = toNum(otaCommission);
  const netAmount =
    parsedAmount != null && parsedGst != null
      ? Math.round((parsedAmount - parsedGst) * 100) / 100
      : null;

  const handleSave = () => {
    if (parsedAmount != null && parsedGst != null && parsedGst > parsedAmount) {
      toast.error("GST cannot exceed the total booking amount");
      return;
    }
    startTransition(async () => {
      const result = await updateICalBlockingCommercialInfo(blockingId, {
        customerId: customerId ?? null,
        icalBookingAmountWithGst: parsedAmount,
        icalBookingGst: parsedGst,
        icalNetBookingAmount: netAmount,
        icalOtaCommission: parsedCommission,
      });
      if (result.error) toast.error(result.error);
      else toast.success("Commercial info saved.");
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      {/* Accent bar */}
      <div className="h-1.5 w-full bg-linear-to-r from-emerald-400 via-teal-500 to-cyan-500" />

      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
              <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Commercial Info</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {otaName ? `${otaName} booking financials` : "OTA booking financials"} for this iCal block
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-5">

          {/* ── LEFT: Inputs (3 cols) ── */}
          <div className="flex flex-col gap-5 xl:col-span-3">

            <Field label="Customer" hint="Guest who made the OTA booking">
              <CustomerSelector
                customerId={customerId}
                update={setCustomerId}
                brandName={brandName ?? undefined}
              />
            </Field>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field
                label="Booking Amount with GST"
                hint="Total amount guest paid on OTA"
              >
                <MoneyInput
                  id="amountWithGst"
                  value={amountWithGst}
                  onChange={setAmountWithGst}
                  placeholder="e.g. 11800"
                />
              </Field>

              <Field
                label="Booking GST"
                hint="GST component within the amount"
              >
                <MoneyInput
                  id="bookingGst"
                  value={bookingGst}
                  onChange={setBookingGst}
                  placeholder="e.g. 1800"
                />
              </Field>
            </div>

            <Field
              label="Net Booking Amount"
              hint="Auto-calculated: Amount with GST − GST"
            >
              <MoneyInput
                value={netAmount != null ? String(netAmount) : ""}
                placeholder="Calculated automatically"
                readOnly
              />
            </Field>

            <Field
              label={`${otaName ?? "OTA"} Commission`}
              hint="Commission fee charged by the OTA platform"
            >
              <MoneyInput
                id="otaCommission"
                value={otaCommission}
                onChange={setOtaCommission}
                placeholder="e.g. 1550"
              />
            </Field>
          </div>

          {/* ── RIGHT: Receipt (2 cols) ── */}
          <div className="xl:col-span-2">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Breakdown
            </p>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-700/60 dark:bg-gray-800/50">
              {/* Receipt rows */}
              <div className="divide-y divide-gray-100 px-5 dark:divide-gray-700/60">

                {/* Gross amount */}
                <div className="flex items-center justify-between py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-indigo-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">Amount incl. GST</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                    {inr(parsedAmount)}
                  </span>
                </div>

                {/* GST deduction */}
                <div className="flex items-center justify-between py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">GST</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-rose-500 dark:text-rose-400">
                    {parsedGst != null ? `− ${inr(parsedGst)}` : "—"}
                  </span>
                </div>

                {/* Net amount — highlighted */}
                <div className="flex items-center justify-between bg-indigo-50/60 px-5 -mx-5 py-3.5 dark:bg-indigo-900/10">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Net Booking Amount</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
                    {inr(netAmount)}
                  </span>
                </div>

                {/* OTA commission */}
                <div className="flex items-center justify-between py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-rose-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {otaName ?? "OTA"} Commission
                    </span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-rose-500 dark:text-rose-400">
                    {parsedCommission != null ? `− ${inr(parsedCommission)}` : "—"}
                  </span>
                </div>
              </div>

              {/* Footer hint */}
              <div className="rounded-b-2xl border-t border-gray-100 bg-gray-100/60 px-5 py-3 dark:border-gray-700/60 dark:bg-gray-700/20">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Values update live as you type on the left.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Changes are saved to this iCal blocking record.
          </p>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {isPending ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Save Commercial Info
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
