"use client";

import { useEffect, useMemo, useState } from "react";
import { searchCustomer, createCustomer } from "@/actions/customerActions";
import { searchOtaMatchCandidates, type ImportedIcalBookingRow } from "@/actions/bookingActions";
import type { CustomerData } from "@/utils/types";
import { useWizard, money } from "../WizardContext";
import { useWizardProperties } from "../useWizardProperties";
import { useDebouncedCallback } from "@/utils/debounce";
import { FieldLabel, inputCls, inputStyle } from "./FieldBits";
import StayCalendar from "./StayCalendar";
import OfflineBookingGrid from "../../edit/OfflineBookingGrid";

const OTA_CHANNELS = ["Airbnb", "Booking.com", "MakeMyTrip", "Agoda", "Goibibo", "Other"];

function shortDate(iso: string): string {
  return new Date(`${iso}T00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function customerName(c: CustomerData): string {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed guest";
}

// Best-effort match of the feed's free-text source/link name (e.g. an admin-
// named iCal link like "Airbnb - Meadow Retreat") against the fixed channel
// list -- falls back to "Other" rather than guessing wrong into the select.
function matchOtaChannel(source: string | null | undefined): string {
  if (!source) return "Other";
  const lower = source.toLowerCase();
  return OTA_CHANNELS.find((c) => c !== "Other" && lower.includes(c.toLowerCase())) || "Other";
}

export default function OtaLoggingForm() {
  const { s, patch } = useWizard();
  const { properties, loading } = useWizardProperties(s.brandName);
  const [results, setResults] = useState<CustomerData[]>([]);
  const [searching, setSearching] = useState(false);
  const [ngPhoneBad, setNgPhoneBad] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feed, setFeed] = useState<ImportedIcalBookingRow[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [showDeductions, setShowDeductions] = useState(false);

  // Real data: real iCal-synced `blocking` rows and manually-logged
  // `thirdPartyBookings` rows the admin hasn't completed yet, from the same
  // endpoint that backs /admin/bookings/third-party.
  useEffect(() => {
    if (s.icalSync !== "yes") return;
    let cancelled = false;
    setFeedLoading(true);
    setFeedError(null);
    searchOtaMatchCandidates({ limit: 50 })
      .then((res) => {
        if (cancelled) return;
        if (res.error) {
          setFeedError(res.error);
          setFeed([]);
          return;
        }
        setFeed(res.success || []);
      })
      .finally(() => {
        if (!cancelled) setFeedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [s.icalSync]);

  const visibleCandidates = useMemo(() => {
    const q = s.icalQuery.trim().toLowerCase();
    return feed
      .filter((r) => (r.dataCompletionStatus || "PENDING") !== "COMPLETED")
      .filter((r) => {
        if (q && !`${r.guestName || ""} ${r.externalBookingId || ""} ${r.propertyName || ""} ${r.summary || ""}`.toLowerCase().includes(q)) return false;
        if (s.icalDate && !(s.icalDate >= r.checkinDate && s.icalDate <= r.checkoutDate)) return false;
        return true;
      });
  }, [feed, s.icalQuery, s.icalDate]);
  const visibleFeed = s.icalShowAll ? visibleCandidates : visibleCandidates.slice(0, 3);

  const doSearch = (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const fd = new FormData();
    fd.set("searchKey", /^\d/.test(q.trim()) ? "Mobile" : q.includes("@") ? "Email" : "Name");
    fd.set("searchValue", q);
    searchCustomer(fd, { brandName: s.brandName })
      .then((res) => setResults(res.data || []))
      .finally(() => setSearching(false));
  };
  const runSearch = useDebouncedCallback(doSearch, 400);

  const selectCustomer = (c: CustomerData) => {
    patch({ customerId: c.id, customer: { id: c.id, name: customerName(c), phone: c.mobileNumber, email: c.email || undefined } });
  };

  // Pulls in everything the matched record actually has -- property, dates,
  // channel, guest identity, and settlement figures (commission/GST/TDS are
  // stored as percentages on the source row, so they're converted to the
  // rupee amounts this form's fields expect). Anything the record doesn't
  // carry is left exactly as-is, not zeroed or guessed.
  const selectMatch = (row: ImportedIcalBookingRow) => {
    const matchedProperty = properties.find((p) => p.id === row.propertyId) || null;
    const channel = matchOtaChannel(row.source);
    const gross = row.totalAmountInclGst ?? null;
    const commissionAmount =
      gross != null && row.thirdPartyCommissionPercentage != null ? Math.round((gross * row.thirdPartyCommissionPercentage) / 100) : null;
    const gstAmount = gross != null && row.gstRate != null ? Math.round((gross * row.gstRate) / (100 + row.gstRate)) : null;
    const tdsAmount = gross != null && row.tdsRate != null ? Math.round((gross * row.tdsRate) / 100) : null;
    const noteParts = [row.summary, channel === "Other" && row.source ? `Source on feed: ${row.source}` : null].filter(
      (v): v is string => !!v,
    );

    patch({
      icalBooking: row.thirdPartyBookingId || row.id,
      checkIn: row.checkinDate,
      checkOut: row.checkoutDate,
      otaChannel: channel,
      ota: {
        ...s.ota,
        channel,
        ref: row.externalBookingId || s.ota.ref,
        amount: gross != null ? String(gross) : s.ota.amount,
        commission: commissionAmount != null ? String(commissionAmount) : s.ota.commission,
        occTax: gstAmount != null ? String(gstAmount) : s.ota.occTax,
        tds: tdsAmount != null ? String(tdsAmount) : s.ota.tds,
        notes: noteParts.length ? noteParts.join(" — ") : s.ota.notes,
      },
      propertyId: row.propertyId || s.propertyId,
      property: matchedProperty || s.property,
      ...(row.guestCount != null ? { adults: Math.max(1, row.guestCount) } : {}),
      ...(row.guestName ? { custQ: row.guestName } : {}),
      ...(row.guestPhone ? { ngPhone: row.guestPhone, ngName: row.guestName || "" } : {}),
    });
    if (row.guestPhone) runSearch(row.guestPhone);
    else if (row.guestName) runSearch(row.guestName);
  };

  const saveGuest = async () => {
    const phoneOk = s.ngPhone.replace(/\D/g, "").length >= 10;
    setNgPhoneBad(!phoneOk);
    if (!s.ngName.trim() || !phoneOk) return;
    setSaving(true);
    try {
      const [firstName, ...rest] = s.ngName.trim().split(/\s+/);
      const fd = new FormData();
      fd.set("firstName", firstName);
      fd.set("lastName", rest.join(" "));
      fd.set("mobileNumber", s.ngPhone.trim());
      fd.set("email", s.ngEmail.trim());
      const res = await createCustomer(fd, { brandName: s.brandName });
      if (res.error) return;
      const lookup = new FormData();
      lookup.set("searchKey", "Mobile");
      lookup.set("searchValue", s.ngPhone.trim());
      const found = await searchCustomer(lookup, { brandName: s.brandName });
      const match = found.data?.find((c) => c.mobileNumber === s.ngPhone.trim());
      if (match) selectCustomer(match);
      patch({ newGuestOpen: false, ngName: "", ngPhone: "", ngEmail: "" });
    } finally {
      setSaving(false);
    }
  };

  // Persisted financial values are always normalised: the booking total is
  // GST-inclusive and the platform commission base and its GST are separate.
  // This lets an operator copy a statement exactly whether it reports its
  // booking and commission figures before or after GST.
  const enteredGross = Math.max(0, Number(s.ota.amount) || 0);
  const occTax = Math.max(0, Number(s.ota.occTax) || 0);
  const gross = s.ota.amountInputType === "EXCLUSIVE" ? enteredGross + occTax : enteredGross;
  const grossExclGst = Math.max(0, gross - occTax);
  const comm = Math.max(0, Number(s.ota.commission) || 0);
  const platformCommissionInput = Math.max(0, Number(s.ota.platformCommission) || 0);
  const platformCommissionGst = Math.max(0, Number(s.ota.platformCommissionGst) || 0);
  const platformCommission =
    s.ota.commissionGstMode === "INCLUSIVE"
      ? Math.max(0, platformCommissionInput - platformCommissionGst)
      : platformCommissionInput;
  const platformCommissionTotal = platformCommission + platformCommissionGst;
  const tds = Math.max(0, Number(s.ota.tds) || 0);
  const net = Math.max(0, gross - comm - occTax - platformCommissionTotal - tds);
  const totalDeductions = comm + occTax + platformCommissionTotal + tds;
  // These are stable Date instances. Passing new Date(...) during every parent
  // render used to make the detail grid interpret a keystroke as a date change
  // and clear the amount the operator had just typed.
  const daywiseCheckinDate = useMemo(() => (s.checkIn ? new Date(`${s.checkIn}T00:00:00`) : undefined), [s.checkIn]);
  const daywiseCheckoutDate = useMemo(() => (s.checkOut ? new Date(`${s.checkOut}T00:00:00`) : undefined), [s.checkOut]);

  const guestPicker = (
    <div style={{ position: "relative" }}>
      <FieldLabel required>Guest</FieldLabel>
      {s.customer ? (
        <div className="flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background: "var(--accSoft)", border: "1px solid var(--acc)" }}>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-extrabold">{s.customer.name}</div>
            <div className="text-[11.5px]" style={{ color: "var(--mut)" }}>
              {s.customer.phone}
            </div>
          </div>
          <button onClick={() => patch({ customerId: null, customer: null })} className="text-[12px] font-extrabold" style={{ color: "var(--acc)" }}>
            Change
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <input
              className={inputCls}
              style={{ ...inputStyle, flex: 1 }}
              value={s.custQ}
              onChange={(e) => {
                // Digits-first input means a phone number, not a name -- cap it
                // at 10 digits (a full Indian mobile number) instead of letting
                // a pasted/mistyped string run on indefinitely.
                const raw = e.target.value;
                const v = /^\d/.test(raw) ? raw.replace(/\D/g, "").slice(0, 10) : raw;
                patch({ custQ: v });
                runSearch(v);
              }}
              placeholder="Search by name or mobile number, or type a new name"
            />
            {s.custQ.trim() && (
              <button
                type="button"
                onClick={() => doSearch(s.custQ)}
                disabled={searching}
                title="Refresh search"
                aria-label="Refresh search"
                className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] disabled:opacity-50"
                style={{ background: "var(--soft)", border: "1px solid var(--line)" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => patch({ newGuestOpen: true, ngName: /^\d/.test(s.custQ) ? "" : s.custQ })}
              title="Add a new customer"
              aria-label="Add a new customer"
              className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] text-[18px] font-extrabold"
              style={{ background: "var(--acc)", color: "var(--accOn)" }}
            >
              +
            </button>
          </div>
          {!searching && results.length > 0 && (
            <div className="ibw-card mt-1.5 overflow-hidden" style={{ position: "absolute", left: 0, right: 0, zIndex: 6 }}>
              {results.map((c) => (
                <div
                  key={c.id}
                  onClick={() => selectCustomer(c)}
                  className="flex cursor-pointer items-center gap-2.5 px-3 py-2.5"
                  style={{ borderTop: "1px solid var(--line)" }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold">{customerName(c)}</div>
                    <div className="text-[11.5px]" style={{ color: "var(--mut)" }}>
                      {c.mobileNumber}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!searching && s.custQ.trim().length > 1 && results.length === 0 && (
            <div className="ibw-card mt-1.5 p-3" style={{ position: "absolute", left: 0, right: 0, zIndex: 6 }}>
              <div className="mb-2 text-[12px]" style={{ color: "var(--mut)" }}>
                No match for "{s.custQ}".
              </div>
              <button
                onClick={() => patch({ newGuestOpen: true, ngName: s.custQ })}
                className="w-full rounded-lg py-2 text-[12.5px] font-extrabold"
                style={{ background: "var(--acc)", color: "var(--accOn)" }}
              >
                + Add to customer database
              </button>
            </div>
          )}
        </>
      )}
      {s.newGuestOpen && (
        <div className="ibw-fade-up mt-2.5 rounded-xl p-3.5" style={{ background: "var(--card)", border: "1px solid var(--acc)" }}>
          <div className="mb-2.5 text-[13px] font-extrabold">New customer</div>
          <div className="flex flex-wrap items-end gap-3">
            <input className={inputCls} style={{ ...inputStyle, flex: "1 1 160px" }} value={s.ngName} onChange={(e) => patch({ ngName: e.target.value })} placeholder="Full name *" />
            <div style={{ flex: "1 1 160px" }}>
              <input
                className={inputCls}
                style={inputStyle}
                value={s.ngPhone}
                onChange={(e) => patch({ ngPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                placeholder="9000000000"
              />
              {ngPhoneBad && (
                <div className="mt-1 text-[11px] font-bold" style={{ color: "var(--bad)" }}>
                  Enter at least 10 digits
                </div>
              )}
            </div>
            <input className={inputCls} style={{ ...inputStyle, flex: "1.2 1 180px" }} value={s.ngEmail} onChange={(e) => patch({ ngEmail: e.target.value })} placeholder="name@email.com" />
            <div className="flex gap-2">
              <button onClick={saveGuest} disabled={saving} className="rounded-lg px-3.5 py-2.5 text-[12.5px] font-extrabold disabled:opacity-60" style={{ background: "var(--acc)", color: "var(--accOn)" }}>
                {saving ? "Saving…" : "Save customer"}
              </button>
              <button onClick={() => patch({ newGuestOpen: false })} className="px-2 text-[12px] font-extrabold" style={{ color: "var(--mut)" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl px-4 py-3 text-[12.5px] font-bold" style={{ background: "var(--blueSoft)", color: "var(--blue)" }}>
        Logging a booking already confirmed on an OTA channel — this blocks the property's calendar and records the settlement. No
        guest payment link, invoice, or reservation record is created here.
      </div>

      <div className="ibw-card p-5">
        <div className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "var(--mut)" }}>
          01 · iCal sync
        </div>
        <div className="text-[15px] font-extrabold">Is this booking already synced on iCal?</div>
        <div className="mb-3 text-[12.5px]" style={{ color: "var(--mut)" }}>
          A synced booking already holds these dates on the calendar — pick it instead of creating a duplicate.
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
          {[
            { k: "yes" as const, label: "Yes — synced on iCal", sub: "Attach the imported booking" },
            { k: "no" as const, label: "No — not on the feed", sub: "Create a fresh booking with dates" },
          ].map((c) => {
            const on = s.icalSync === c.k;
            return (
              <div
                key={c.k}
                onClick={() => patch({ icalSync: c.k })}
                className="cursor-pointer rounded-2xl p-3.5"
                style={{ background: on ? "var(--accSoft)" : "var(--soft)", border: `1px solid ${on ? "var(--acc)" : "var(--line)"}` }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-5 w-5 flex-none items-center justify-center rounded-full text-[12px] font-extrabold"
                    style={{ background: on ? "var(--acc)" : "transparent", border: on ? "none" : "2px solid var(--line)", color: "var(--accOn)" }}
                  >
                    {on ? "✓" : ""}
                  </span>
                  <div>
                    <div className="text-[13.5px] font-extrabold">{c.label}</div>
                    <div className="text-[11.5px]" style={{ color: "var(--mut)" }}>
                      {c.sub}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {s.icalSync && (
        <div className="ibw-card ibw-fade-up p-5">
          <div className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "var(--mut)" }}>
            02 · Channel &amp; property
          </div>
          <div className="flex flex-wrap items-end gap-3.5">
            <div style={{ flex: "1 1 190px" }}>
              <FieldLabel required>OTA channel</FieldLabel>
              <select
                className={inputCls}
                style={inputStyle}
                value={s.otaChannel}
                onChange={(e) => patch({ otaChannel: e.target.value, ota: { ...s.ota, channel: e.target.value } })}
              >
                {OTA_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: "1.3 1 220px" }}>
              <FieldLabel required>Property</FieldLabel>
              <select
                className={inputCls}
                style={inputStyle}
                value={s.propertyId || ""}
                onChange={(e) => {
                  const p = properties.find((x) => x.id === e.target.value) || null;
                  patch({ propertyId: e.target.value || null, property: p, checkIn: null, checkOut: null });
                }}
              >
                <option value="">{loading ? "Loading properties…" : "Select property…"}</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code ? `${p.code} - ${p.name}` : p.name}
                  </option>
                ))}
              </select>
            </div>
            {[
              { k: "adults" as const, label: "Adults" },
              { k: "children" as const, label: "Children" },
              { k: "infants" as const, label: "Infants" },
            ].map((g) => (
              <div key={g.k} style={{ flex: "0 1 124px", minWidth: 112 }}>
                <FieldLabel>{g.label}</FieldLabel>
                <div className="flex items-center justify-between gap-1.5 rounded-xl px-2 py-1.5" style={{ background: "var(--soft)", border: "1px solid var(--line)" }}>
                  <button
                    onClick={() => patch({ [g.k]: Math.max(g.k === "adults" ? 1 : 0, s[g.k] - 1) } as any)}
                    className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] text-[16px] font-extrabold"
                    style={{ border: "1px solid var(--line)", background: "var(--card)" }}
                  >
                    −
                  </button>
                  <div className="text-[16px] font-extrabold tabular-nums">{s[g.k]}</div>
                  <button
                    onClick={() => patch({ [g.k]: s[g.k] + 1 } as any)}
                    className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] text-[16px] font-extrabold"
                    style={{ border: "1px solid var(--line)", background: "var(--card)" }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {s.icalSync && (
        <div className="ibw-card ibw-fade-up p-5">
          <div className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "var(--mut)" }}>
            03 · {s.icalSync === "yes" ? "Match from the feed" : "Guest & stay dates"}
          </div>
          {s.icalSync === "yes" && (
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2.5">
              <span className="min-w-[200px] flex-1 text-[11.5px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--mut)" }}>
                Unmatched bookings on the feed
              </span>
              <span className="text-[11.5px]" style={{ color: "var(--mut)" }}>
                Real data — synced iCal imports and manually-logged OTA bookings not yet completed.
              </span>
            </div>
            <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
              <input
                className={inputCls}
                style={{ ...inputStyle, flex: 1, minWidth: 200 }}
                value={s.icalQuery}
                onChange={(e) => patch({ icalQuery: e.target.value })}
                placeholder="Search guest name, property or platform ID…"
              />
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap text-[12px] font-bold" style={{ color: "var(--mut)" }}>
                  Stay covering
                </span>
                <input type="date" className={inputCls} style={inputStyle} value={s.icalDate} onChange={(e) => patch({ icalDate: e.target.value })} />
              </div>
              {(s.icalQuery || s.icalDate) && (
                <button onClick={() => patch({ icalQuery: "", icalDate: "" })} className="text-[12px] font-extrabold" style={{ color: "var(--acc)" }}>
                  Clear
                </button>
              )}
            </div>
            {feedLoading && (
              <div className="rounded-xl p-4 text-center text-[12.5px]" style={{ background: "var(--soft)", border: "1px dashed var(--line)", color: "var(--mut)" }}>
                Loading synced bookings…
              </div>
            )}
            {!feedLoading && feedError && (
              <div className="rounded-xl px-3.5 py-2.5 text-[12.5px] font-bold" style={{ background: "var(--badSoft)", color: "var(--bad)" }}>
                {feedError}
              </div>
            )}
            {!feedLoading && !feedError && (
              <div className="flex flex-col gap-2">
                {visibleFeed.map((r) => {
                  const on = s.icalBooking === (r.thirdPartyBookingId || r.id);
                  return (
                    <div
                      key={r.id}
                      onClick={() => selectMatch(r)}
                      className="flex cursor-pointer flex-wrap items-center gap-3 rounded-xl p-3"
                      style={{ background: on ? "var(--accSoft)" : "var(--soft)", border: `1px solid ${on ? "var(--acc)" : "var(--line)"}` }}
                    >
                      <span
                        className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full text-[11px] font-extrabold"
                        style={{ background: on ? "var(--acc)" : "transparent", border: on ? "none" : "2px solid var(--line)", color: "var(--accOn)" }}
                      >
                        {on ? "✓" : ""}
                      </span>
                      <div style={{ flex: "1.3 1", minWidth: 150 }}>
                        <div className="text-[13.5px] font-extrabold">{r.guestName || r.propertyName || "Unmatched stay"}</div>
                        <div className="text-[11px]" style={{ color: "var(--mut)" }}>
                          {r.propertyName || "--"}
                        </div>
                      </div>
                      <div style={{ flex: "1.2 1", minWidth: 150 }}>
                        <div className="text-[13px] font-bold">
                          {shortDate(r.checkinDate)} – {shortDate(r.checkoutDate)}
                        </div>
                        <div className="font-mono text-[11.5px]" style={{ color: "var(--mut)" }}>
                          {r.externalBookingId || "--"}
                        </div>
                      </div>
                      <div className="text-[11px] font-extrabold uppercase tracking-[0.1em]" style={{ color: "var(--mut)" }}>
                        {r.source || "--"}
                      </div>
                    </div>
                  );
                })}
                {visibleFeed.length === 0 && (
                  <div className="rounded-xl p-4 text-center text-[12.5px]" style={{ background: "var(--soft)", border: "1px dashed var(--line)", color: "var(--mut)" }}>
                    No booking on the feed matches these filters.
                  </div>
                )}
              </div>
            )}
            {visibleCandidates.length > 3 && (
              <button
                onClick={() => patch({ icalShowAll: !s.icalShowAll })}
                className="mt-2 w-full rounded-xl py-2.5 text-[12.5px] font-extrabold"
                style={{ background: "var(--soft)", border: "1px solid var(--line)" }}
              >
                {s.icalShowAll ? "Show fewer" : "Show more"}
              </button>
            )}
            {s.icalBooking && (
              <div className="mt-2.5 rounded-xl px-3.5 py-2.5 text-[12.5px] font-bold" style={{ background: "var(--greenSoft)", color: "var(--green)" }}>
                Pulled from the feed — property, dates, channel and any known settlement figures below are pre-filled. Double-check the
                amounts before saving; anything the feed didn't have is left for you to fill in.
              </div>
            )}
            <div className="mt-3.5">{guestPicker}</div>
          </div>
        )}

        {s.icalSync === "no" && (
          <div className="ibw-fade-up mt-4 flex flex-col gap-3.5">
            <div className="rounded-2xl p-4" style={{ background: "var(--soft)", border: "1px dashed var(--line)" }}>
              <div className="mb-0.5 text-[13.5px] font-extrabold">Create a fresh booking</div>
              <div className="mb-3 text-[12px]" style={{ color: "var(--mut)" }}>
                Nothing on the feed to attach to — pick the guest below.
              </div>
              {guestPicker}
            </div>
            {s.propertyId ? (
              <StayCalendar collapsible />
            ) : (
              <div className="rounded-2xl p-4 text-center text-[12.5px] font-semibold" style={{ background: "var(--blueSoft)", color: "var(--blue)" }}>
                Pick a property above to see its real availability and select stay dates.
              </div>
            )}
          </div>
          )}
        </div>
      )}

      <div className="ibw-card p-5">
        <div className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "var(--mut)" }}>
          04 · Platform settlement
        </div>
        <div className="rounded-2xl p-4" style={{ background: "var(--soft)", border: "1px solid var(--line)" }}>
          <FieldLabel required>Guest paid to OTA</FieldLabel>
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[180px] flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-extrabold" style={{ color: "var(--mut)" }}>₹</span>
              <input
                aria-label="Guest paid to OTA"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                className={`${inputCls} pl-7 tabular-nums`}
                style={inputStyle}
                value={s.ota.amount}
                onChange={(event) => patch({ ota: { ...s.ota, amount: event.target.value } })}
                placeholder="0"
              />
            </div>
            <select
              aria-label="Guest amount GST treatment"
              className="min-w-[158px] rounded-xl px-3 py-2.5 text-[13px] font-bold"
              style={inputStyle}
              value={s.ota.amountInputType}
              onChange={(event) => patch({ ota: { ...s.ota, amountInputType: event.target.value as "INCLUSIVE" | "EXCLUSIVE" } })}
            >
              <option value="INCLUSIVE">Amount includes GST</option>
              <option value="EXCLUSIVE">Amount excludes GST</option>
            </select>
          </div>
          <p className="mt-1.5 text-[11.5px]" style={{ color: "var(--mut)" }}>
            Copy the booking total once from the OTA statement. The detailed fields below are optional deductions, not another total.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowDeductions((open) => !open)}
          aria-expanded={showDeductions}
          className="mt-3.5 flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left"
          style={{ background: "var(--soft)", border: "1px solid var(--line)" }}
        >
          <span>
            <span className="block text-[13px] font-extrabold">Add statement deductions</span>
            <span className="mt-0.5 block text-[11.5px]" style={{ color: "var(--mut)" }}>Only enter an OTA fee, tax, TDS or Mago commission when it appears on the statement.</span>
          </span>
          <span className="whitespace-nowrap text-[12px] font-extrabold" style={{ color: "var(--acc)" }}>{showDeductions ? "Hide" : "Add"}</span>
        </button>

        {showDeductions && (
        <div className="ibw-fade-up mt-3.5 grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div className="hidden">
            <FieldLabel required>Guest amount copied from OTA statement</FieldLabel>
            <select
              className={inputCls}
              style={inputStyle}
              value={s.ota.amountInputType}
              onChange={(e) => patch({ ota: { ...s.ota, amountInputType: e.target.value as "INCLUSIVE" | "EXCLUSIVE" } })}
            >
              <option value="INCLUSIVE">GST inclusive</option>
              <option value="EXCLUSIVE">GST exclusive</option>
            </select>
            <input
              aria-label="Guest amount copied from OTA statement"
              type="text"
              autoComplete="off"
              className={`${inputCls} mt-2 tabular-nums`}
              style={inputStyle}
              inputMode="decimal"
              value={s.ota.amount}
              onChange={(e) => patch({ ota: { ...s.ota, amount: e.target.value } })}
              placeholder={s.ota.amountInputType === "INCLUSIVE" ? "Amount including GST" : "Amount before GST"}
            />
          </div>
          <div>
            <FieldLabel>OTA commission / fee</FieldLabel>
            <input className={inputCls} style={inputStyle} value={s.ota.commission} onChange={(e) => patch({ ota: { ...s.ota, commission: e.target.value } })} placeholder="0" />
          </div>
          <div>
            <FieldLabel>Remitted occupancy tax · GST collected from customer</FieldLabel>
            <input className={inputCls} style={inputStyle} value={s.ota.occTax} onChange={(e) => patch({ ota: { ...s.ota, occTax: e.target.value } })} placeholder="0" />
          </div>
          <div>
            <FieldLabel>TDS deducted</FieldLabel>
            <input className={inputCls} style={inputStyle} value={s.ota.tds} onChange={(e) => patch({ ota: { ...s.ota, tds: e.target.value } })} placeholder="0" />
          </div>
          <div>
            <FieldLabel>Platform commission deduction</FieldLabel>
            <select
              className={inputCls}
              style={inputStyle}
              value={s.ota.commissionGstMode}
              onChange={(e) => patch({ ota: { ...s.ota, commissionGstMode: e.target.value as "INCLUSIVE" | "EXCLUSIVE" } })}
            >
              <option value="EXCLUSIVE">Commission before GST</option>
              <option value="INCLUSIVE">Commission including GST</option>
            </select>
            <input
              aria-label="Platform commission deduction"
              type="text"
              autoComplete="off"
              className={`${inputCls} mt-2 tabular-nums`}
              style={inputStyle}
              inputMode="decimal"
              value={s.ota.platformCommission}
              onChange={(e) => patch({ ota: { ...s.ota, platformCommission: e.target.value } })}
              placeholder="Commission amount"
            />
          </div>
          <div>
            <FieldLabel>GST on platform commission</FieldLabel>
            <input
              className={inputCls}
              style={inputStyle}
              inputMode="decimal"
              value={s.ota.platformCommissionGst}
              onChange={(e) => patch({ ota: { ...s.ota, platformCommissionGst: e.target.value } })}
              placeholder="0"
            />
          </div>
        </div>
        )}
        <div className="mt-3.5 grid gap-px overflow-hidden rounded-2xl sm:grid-cols-3" style={{ background: "var(--line)", border: "1px solid var(--line)" }}>
          {[
            { label: "Guest paid to OTA", value: money(gross), color: "var(--txt)" },
            { label: "Statement deductions", value: `−${money(totalDeductions)}`, color: totalDeductions > 0 ? "var(--bad)" : "var(--mut)" },
            { label: "Expected OTA remittance", value: money(net), color: "var(--green)" },
          ].map((summary) => (
            <div key={summary.label} className="px-4 py-3" style={{ background: "var(--soft)" }}>
              <div className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--mut)" }}>{summary.label}</div>
              <div className="mt-0.5 text-[16px] font-extrabold tabular-nums" style={{ color: summary.color }}>{summary.value}</div>
            </div>
          ))}
        </div>
        <div className="hidden" aria-hidden="true">
          {[
            { k: "Collected by OTA from guest", v: money(gross) },
            { k: "Booking value before GST", v: money(grossExclGst) },
            { k: "Less OTA commission / fee", v: `−${money(comm)}` },
            { k: "Less booking GST collected", v: `−${money(occTax)}` },
            { k: "Less TDS deducted", v: `−${money(tds)}` },
            { k: "Less platform commission", v: `−${money(platformCommission)}` },
            { k: "Less GST on platform commission", v: `−${money(platformCommissionGst)}` },
          ].map((row) => (
            <div key={row.k} className="flex justify-between gap-2.5 py-1 text-[12.5px]">
              <span style={{ color: "var(--mut)" }}>{row.k}</span>
              <span className="font-bold tabular-nums" style={{ color: "var(--mut)" }}>
                {row.v}
              </span>
            </div>
          ))}
          <div className="mt-1.5 flex justify-between gap-2.5 pt-2.5 text-[14px] font-extrabold" style={{ borderTop: "2px solid var(--txt)" }}>
            <span>Net payout expected from OTA</span>
            <span className="tabular-nums">{money(net)}</span>
          </div>
        </div>
        <details className="mt-3.5 rounded-2xl p-3.5" style={{ background: "var(--soft)", border: "1px solid var(--line)" }}>
          <summary className="cursor-pointer list-none text-[13px] font-extrabold" style={{ color: "var(--txt)" }}>
            Night-wise breakup <span className="ml-1 text-[11.5px] font-semibold" style={{ color: "var(--mut)" }}>(optional audit detail)</span>
          </summary>
          <p className="mt-1.5 text-[11.5px]" style={{ color: "var(--mut)" }}>
            Add nightly figures only when the OTA statement provides them. Your booking total above remains the single source of truth.
          </p>
          <div className="mt-3.5">
          <OfflineBookingGrid
            checkinDate={daywiseCheckinDate}
            checkoutDate={daywiseCheckoutDate}
            amountInputType={s.ota.amountInputType}
            totalBookingPrice={gross}
            onPayloadChange={(payload) => patch({ ota: { ...s.ota, daywiseBreakup: payload } })}
          />
          </div>
        </details>
        <div className="mt-3.5">
          <FieldLabel>Notes</FieldLabel>
          <textarea
            rows={3}
            className={inputCls}
            style={{ ...inputStyle, resize: "vertical" }}
            value={s.ota.notes}
            onChange={(e) => patch({ ota: { ...s.ota, notes: e.target.value } })}
            placeholder="Anything finance or ops should know — payout batch, waived fee, guest request from the platform thread…"
          />
        </div>
      </div>
    </div>
  );
}
