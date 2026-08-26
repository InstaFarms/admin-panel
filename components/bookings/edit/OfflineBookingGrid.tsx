"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { addDays, differenceInDays, format } from "date-fns";

type DaywiseEntry = {
  date: string;
  roomFee: string;
  extraGuestFee: string;
  discount: string;
};

type OfflineBookingGridProps = {
  checkinDate?: Date;
  checkoutDate?: Date;
  /** Values typed in each row are either GST-inclusive receipt amounts or GST-exclusive rates. */
  amountInputType?: "INCLUSIVE" | "EXCLUSIVE";
  totalBookingPrice: number;
  onPayloadChange: (payload: any[]) => void;
};

const amountInputStyle: React.CSSProperties = {
  background: "var(--soft)",
  border: "1px solid var(--line)",
  color: "var(--txt)",
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const readAmount = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

function dayKey(value?: Date) {
  return value ? format(value, "yyyy-MM-dd") : "";
}

function createEntries(checkinDate?: Date, checkoutDate?: Date): DaywiseEntry[] {
  if (!checkinDate || !checkoutDate || checkinDate >= checkoutDate) return [];
  const nights = differenceInDays(checkoutDate, checkinDate);
  return Array.from({ length: Math.max(0, nights) }, (_, index) => ({
    date: format(addDays(checkinDate, index), "yyyy-MM-dd"),
    roomFee: "",
    extraGuestFee: "",
    discount: "",
  }));
}

/**
 * Optional audit detail for an OTA/offline booking.
 *
 * The parent wizard intentionally rerenders whenever a financial field changes.
 * Therefore this component keys its reset logic on date *values* instead of Date
 * object identity; a freshly-created Date from the parent must never erase a
 * value that an operator just typed into a night row.
 */
export default function OfflineBookingGrid({
  checkinDate,
  checkoutDate,
  amountInputType = "INCLUSIVE",
  totalBookingPrice,
  onPayloadChange,
}: OfflineBookingGridProps) {
  const stayWindowKey = `${dayKey(checkinDate)}:${dayKey(checkoutDate)}`;
  const [entries, setEntries] = useState<DaywiseEntry[]>(() => createEntries(checkinDate, checkoutDate));
  const [gstRatePct, setGstRatePct] = useState(18);
  const lastPublishedPayload = useRef<string | null>(null);
  const gstRate = gstRatePct / 100;

  useEffect(() => {
    const nextDates = createEntries(checkinDate, checkoutDate);
    setEntries((current) => {
      const currentByDate = new Map(current.map((entry) => [entry.date, entry]));
      const next = nextDates.map((entry) => currentByDate.get(entry.date) ?? entry);
      const unchanged =
        current.length === next.length && current.every((entry, index) => entry === next[index]);
      return unchanged ? current : next;
    });
    // stayWindowKey is deliberately a string, not the two Date instances.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stayWindowKey]);

  const calculatedPayload = useMemo(
    () =>
      entries.map((entry) => {
        const roomFee = readAmount(entry.roomFee);
        const extraGuestFee = readAmount(entry.extraGuestFee);
        const discount = readAmount(entry.discount);
        const multiplier = 1 + gstRate;
        const inputIsInclusive = amountInputType === "INCLUSIVE";
        const baseRentalWithoutGst = roundMoney(inputIsInclusive ? roomFee / multiplier : roomFee);
        const extraAdultGuestChargesWithoutGst = roundMoney(inputIsInclusive ? extraGuestFee / multiplier : extraGuestFee);
        const discountForTheDay = roundMoney(inputIsInclusive ? discount / multiplier : discount);
        const bookingAmountWithoutGST = roundMoney(
          Math.max(0, baseRentalWithoutGst + extraAdultGuestChargesWithoutGst - discountForTheDay),
        );
        const gstAmount = roundMoney(bookingAmountWithoutGST * gstRate);
        const bookingAmountWithGST = roundMoney(bookingAmountWithoutGST + gstAmount);

        return {
          stayDate: entry.date,
          baseRentalWithoutGst,
          extraAdultGuestChargesWithoutGst,
          discountForTheDay,
          bookingAmountWithoutGST,
          gstAmount,
          bookingAmountWithGST,
          bookingGstRate: gstRatePct,
          // Existing consumers still read these aliases.
          basePriceExclGst: baseRentalWithoutGst,
          extraGuestChargesExclGst: extraAdultGuestChargesWithoutGst,
          bookingGstAmount: gstAmount,
        };
      }),
    [amountInputType, entries, gstRate, gstRatePct],
  );

  useEffect(() => {
    const serialised = JSON.stringify(calculatedPayload);
    if (serialised === lastPublishedPayload.current) return;
    lastPublishedPayload.current = serialised;
    onPayloadChange(calculatedPayload);
  }, [calculatedPayload, onPayloadChange]);

  const currentTotal = calculatedPayload.reduce((total, row) => total + row.bookingAmountWithGST, 0);
  const hasEnteredAmount = entries.some((entry) => entry.roomFee || entry.extraGuestFee || entry.discount);
  const difference = roundMoney(currentTotal - Math.max(0, totalBookingPrice || 0));
  const isMismatch = hasEnteredAmount && Math.abs(difference) > 0.05;

  const updateEntry = (index: number, field: Exclude<keyof DaywiseEntry, "date">, value: string) => {
    setEntries((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, [field]: value } : entry)));
  };

  if (entries.length === 0) {
    return (
      <div className="rounded-xl p-3.5 text-[12.5px] font-semibold" style={{ background: "var(--soft)", border: "1px dashed var(--line)", color: "var(--mut)" }}>
        Select valid check-in and check-out dates before adding a night-wise breakup.
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3.5" style={{ borderColor: "var(--line)" }}>
        <div>
          <h3 className="text-[14px] font-extrabold">Night-wise audit breakup</h3>
          <p className="mt-0.5 text-[12px]" style={{ color: "var(--mut)" }}>
            Optional. Keep the total above as the source of truth; use this only when the OTA statement provides nightly figures.
          </p>
        </div>
        <label className="text-[12px] font-bold" style={{ color: "var(--mut)" }}>
          GST slab
          <select
            aria-label="Applicable GST slab"
            value={gstRatePct}
            onChange={(event) => setGstRatePct(Number(event.target.value))}
            className="ml-2 rounded-lg px-2.5 py-1.5 text-[12px] font-extrabold"
            style={amountInputStyle}
          >
            <option value={18}>18%</option>
            <option value={12}>12%</option>
            <option value={5}>5%</option>
            <option value={0}>0%</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full text-left text-[12.5px]">
          <thead style={{ background: "var(--soft)", color: "var(--mut)" }}>
            <tr>
              <th className="px-4 py-3 font-extrabold">Date</th>
              <th className="px-3 py-3 font-extrabold">Room ({amountInputType === "INCLUSIVE" ? "incl. GST" : "excl. GST"})</th>
              <th className="px-3 py-3 font-extrabold">Extra guest</th>
              <th className="px-3 py-3 font-extrabold">Discount</th>
              <th className="px-3 py-3 text-right font-extrabold">Net incl. GST</th>
              <th className="px-4 py-3 text-right font-extrabold">GST</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => {
              const row = calculatedPayload[index];
              const dateLabel = format(new Date(`${entry.date}T00:00:00`), "dd MMM yyyy");
              return (
                <tr key={entry.date} style={{ borderTop: "1px solid var(--line)" }}>
                  <td className="px-4 py-2.5 font-bold">{dateLabel}</td>
                  <td className="px-3 py-2">
                    <input
                      aria-label={`Room amount for ${dateLabel}`}
                      type="text"
                      inputMode="decimal"
                      value={entry.roomFee}
                      onChange={(event) => updateEntry(index, "roomFee", event.target.value)}
                      placeholder="0"
                      className="w-28 rounded-lg px-2.5 py-2 text-[13px] tabular-nums"
                      style={amountInputStyle}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      aria-label={`Extra guest amount for ${dateLabel}`}
                      type="text"
                      inputMode="decimal"
                      value={entry.extraGuestFee}
                      onChange={(event) => updateEntry(index, "extraGuestFee", event.target.value)}
                      placeholder="0"
                      className="w-28 rounded-lg px-2.5 py-2 text-[13px] tabular-nums"
                      style={amountInputStyle}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      aria-label={`Discount amount for ${dateLabel}`}
                      type="text"
                      inputMode="decimal"
                      value={entry.discount}
                      onChange={(event) => updateEntry(index, "discount", event.target.value)}
                      placeholder="0"
                      className="w-28 rounded-lg px-2.5 py-2 text-[13px] tabular-nums"
                      style={{ ...amountInputStyle, color: "var(--bad)" }}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right font-extrabold tabular-nums">₹{row.bookingAmountWithGST.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2.5 text-right font-bold tabular-nums" style={{ color: "var(--mut)" }}>₹{row.gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-px border-t sm:grid-cols-3" style={{ borderColor: "var(--line)", background: "var(--line)" }}>
        {[
          { label: "Nightly sum", value: `₹${currentTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, tone: "var(--txt)" },
          { label: "Statement total", value: `₹${Math.max(0, totalBookingPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, tone: "var(--mut)" },
          { label: isMismatch ? "Difference to resolve" : "Matches statement", value: isMismatch ? `₹${Math.abs(difference).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "✓", tone: isMismatch ? "var(--bad)" : "var(--green)" },
        ].map((item) => (
          <div key={item.label} className="px-4 py-3" style={{ background: "var(--soft)" }}>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--mut)" }}>{item.label}</div>
            <div className="mt-0.5 text-[14px] font-extrabold tabular-nums" style={{ color: item.tone }}>{item.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
