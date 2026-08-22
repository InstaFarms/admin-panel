"use client";

import { useEffect, useRef } from "react";
import { useWizard, money } from "./WizardContext";
import { CountUpValue } from "./WizardBits";
import { animateDonut, flashValue } from "./gsapHelpers";

const SMART_ASSIST: Record<number, { eyebrow: string; title: string; lines: string[]; tone?: "info" | "good" | "warn" }> = {
  1: {
    eyebrow: "Smart Assist",
    title: "Brand, type, source & reason",
    lines: [
      "New Assisted Reservation drives the full pricing & payment flow -- Completed OTA Booking and Blocking are lightweight, no-payment flows.",
      "The booking source drives which commission & tax rules apply downstream, and the reason changes the context chips below it.",
    ],
  },
  2: {
    eyebrow: "Smart Assist",
    title: "Property availability",
    lines: ["Pick a property to lock in exact per-night pricing and re-check availability for your dates."],
  },
  3: {
    eyebrow: "Smart Assist",
    title: "Dates drive the quote",
    lines: ["Stay 3+ nights to unlock a multi-night discount.", "Peak dates carry a minimum-nights rule and higher rates."],
  },
  4: {
    eyebrow: "Smart Assist",
    title: "Search before creating",
    lines: ["Search existing guests by name, phone or email before adding a new profile -- avoids duplicates."],
  },
  5: {
    eyebrow: "Smart Assist",
    title: "Live, indicative pricing",
    lines: ["This quote recalculates from the server as you change dates, guests or coupon.", "GST and commission are computed automatically."],
    tone: "good",
  },
  6: {
    eyebrow: "Smart Assist",
    title: "Collect or send a link",
    lines: ["Record a cash/UPI/bank payment now, or send a hosted payment link the guest can pay themselves."],
  },
  7: {
    eyebrow: "Smart Assist",
    title: "Last check before creating",
    lines: ["Use Edit on any card to jump back and adjust -- nothing is final until you press Create."],
  },
};

const SHORT_ASSIST: Record<string, string> = {
  owner: "Logs a booking already confirmed on an OTA channel -- records the platform's money trail, no guest payment link or invoice is raised here.",
  block: "Operational block only -- the dates are held on the calendar with no guest, payment or invoice attached.",
};

export default function SidebarRail() {
  const { s, goTo } = useWizard();
  const totalRef = useRef<HTMLSpanElement | null>(null);
  const donutRef = useRef<HTMLDivElement | null>(null);

  const guestFlow = s.resType === "guest";
  const total = s.quoteFinalTotal;
  const paid = s.rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  useEffect(() => {
    if (guestFlow && s.step >= 6 && total > 0) {
      animateDonut(donutRef.current, pct);
    }
  }, [guestFlow, s.step, pct, total]);

  const railRows: Array<{ label: string; value: string; step: number }> = guestFlow
    ? [
        { label: "Brand", value: s.brandName || "--", step: 1 },
        { label: "Type", value: "New Assisted Reservation", step: 1 },
        { label: "Source", value: s.sourceKind || "--", step: 1 },
        { label: "Reason", value: s.tripPurpose || "--", step: 1 },
        { label: "Property", value: s.property?.name || "--", step: 2 },
        { label: "Dates", value: s.checkIn && s.checkOut ? `${s.checkIn} → ${s.checkOut}` : "--", step: 3 },
        { label: "Guests", value: String(s.adults + s.children + s.infants), step: 3 },
        { label: "Guest", value: s.customer?.name || "--", step: 4 },
      ]
    : [
        { label: "Brand", value: s.brandName || "--", step: 1 },
        { label: "Type", value: s.resType === "owner" ? "Completed OTA Booking" : "Blocking", step: 1 },
        { label: "Property", value: s.property?.name || "--", step: 2 },
        { label: "Dates", value: s.checkIn && s.checkOut ? `${s.checkIn} → ${s.checkOut}` : "--", step: 2 },
      ];

  const assist = guestFlow ? SMART_ASSIST[s.step] : null;

  return (
    <div className="flex-1" style={{ minWidth: 280, maxWidth: 340 }}>
      <div className="ibw-card sticky top-[74px] flex flex-col gap-4 p-5">
        <div>
          <div className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "var(--mut)" }}>
            Booking Summary (so far)
          </div>
          <div className="flex flex-col gap-1.5">
            {railRows.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-2 text-[12.5px]">
                <span style={{ color: "var(--mut)" }}>{r.label}</span>
                <span className="flex items-center gap-1.5">
                  <RailValue value={r.value} />
                  {r.step <= s.maxStep && r.step !== s.step && (
                    <button
                      onClick={() => goTo(r.step)}
                      className="font-bold underline"
                      style={{ color: "var(--acc)", fontSize: 11 }}
                    >
                      Edit
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
          {guestFlow && total > 0 && (
            <div className="mt-2.5 flex items-center justify-between border-t pt-2.5 text-[13px] font-extrabold" style={{ borderColor: "var(--line)" }}>
              <span>Running total</span>
              <span ref={totalRef}>
                <CountUpValue value={total} format={money} />
              </span>
            </div>
          )}
        </div>

        {guestFlow && s.step >= 6 && total > 0 && (
          <div className="flex items-center gap-3 border-t pt-4" style={{ borderColor: "var(--line)" }}>
            <div
              ref={donutRef}
              className="h-16 w-16 flex-none rounded-full"
              style={{ background: `conic-gradient(var(--acc) ${pct * 3.6}deg, var(--line) 0deg)` }}
            />
            <div className="text-[11.5px]" style={{ color: "var(--mut)" }}>
              <div>
                <span style={{ color: "var(--green)", fontWeight: 700 }}>● Received</span> {money(paid)}
              </div>
              <div>
                <span style={{ color: "var(--amber)", fontWeight: 700 }}>● Outstanding</span> {money(Math.max(0, total - paid))}
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-4" style={{ borderColor: "var(--line)" }}>
          <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "var(--acc)" }}>
            {assist?.eyebrow || "Smart Assist"}
          </div>
          {assist ? (
            <>
              <div className="mb-1.5 text-[13.5px] font-bold">{assist.title}</div>
              <ul className="flex flex-col gap-1.5 text-[12px]" style={{ color: "var(--mut)" }}>
                {assist.lines.map((l) => (
                  <li key={l}>• {l}</li>
                ))}
              </ul>
            </>
          ) : (
            <div className="text-[12.5px] font-semibold" style={{ color: "var(--amber)" }}>
              {SHORT_ASSIST[s.resType]}
            </div>
          )}
        </div>

        <div className="rounded-xl p-3 text-center text-[12px]" style={{ background: "var(--soft)", color: "var(--mut)" }}>
          Need help? <span className="font-bold" style={{ color: "var(--acc)" }}>Contact support</span>
        </div>
      </div>
    </div>
  );
}

function RailValue({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      flashValue(ref.current);
      prev.current = value;
    }
  }, [value]);
  return (
    <span ref={ref} className="font-bold" style={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {value}
    </span>
  );
}
