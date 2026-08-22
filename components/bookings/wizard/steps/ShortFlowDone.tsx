"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard, money } from "../WizardContext";
import { popCheck } from "../gsapHelpers";

const EYEBROW: Record<string, string> = {
  owner: "COMPLETED OTA BOOKING",
  block: "BLOCKING",
};
const HEADLINE: Record<string, string> = {
  owner: "OTA booking logged",
  block: "Property blocked",
};
const CTA_LABEL: Record<string, string> = {
  owner: "Log another OTA booking",
  block: "Create another blocking",
};
const NEXT_STEPS: Record<string, string[]> = {
  owner: [
    "The dates are blocked on the calendar for this property.",
    "The settlement figures are recorded against this booking for finance to reconcile.",
    "No guest payment link or invoice is raised from this flow.",
  ],
  block: [
    "The dates are held on the calendar immediately.",
    "No guest, payment or invoice was created for this block.",
    "Ops can see the block reason on the property's calendar.",
  ],
};

export default function ShortFlowDone() {
  const { s } = useWizard();
  const router = useRouter();
  const checkRef = useRef<HTMLDivElement | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy");

  useEffect(() => {
    popCheck(checkRef.current);
  }, []);

  const copyId = () => {
    if (s.bookingId) navigator.clipboard?.writeText(s.bookingId).catch(() => {});
    setCopyLabel("✓ Copied");
    setTimeout(() => setCopyLabel("Copy"), 1500);
  };

  const resetAll = () => {
    window.location.href = "/admin/bookings/new-reservation";
  };

  const gross = Number(s.ota.amount) || 0;
  const comm = Number(s.ota.commission) || 0;
  const occTax = Number(s.ota.occTax) || 0;
  const tds = Number(s.ota.tds) || 0;
  const net = gross - comm - occTax - tds;

  return (
    <div className="ibw-card overflow-hidden" style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="p-8 pb-6" style={{ background: "var(--greenSoft)", borderBottom: "1px solid var(--line)" }}>
        <div className="flex flex-wrap items-center gap-4">
          <div
            ref={checkRef}
            className="flex h-[60px] w-[60px] flex-none items-center justify-center rounded-full text-[28px] font-extrabold"
            style={{ background: "var(--green)", color: "#fff" }}
          >
            ✓
          </div>
          <div className="min-w-[220px] flex-1">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: "var(--green)" }}>
              {EYEBROW[s.resType]}
            </div>
            <div className="mt-0.5 text-[24px] font-extrabold tracking-tight">{HEADLINE[s.resType]}</div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5" style={{ background: "var(--card)", border: "1px dashed var(--green)" }}>
            <div>
              <div className="text-[10px] font-extrabold tracking-[0.14em]" style={{ color: "var(--mut)" }}>
                REFERENCE ID
              </div>
              <div className="font-mono text-[16px] font-extrabold">{s.bookingId}</div>
            </div>
            <button onClick={copyId} className="rounded-[9px] px-3 py-1.5 text-[12px] font-extrabold" style={{ background: "var(--green)", color: "#fff" }}>
              {copyLabel}
            </button>
          </div>
        </div>
      </div>

      {s.resType === "owner" && (
        <div className="px-8 pt-5">
          <div className="flex flex-wrap gap-3">
            <SettlementTile k="CHANNEL" v={s.otaChannel} sub={s.ota.ref || "no reference"} />
            <SettlementTile k="PROPERTY" v={s.property?.name || "--"} />
            <SettlementTile k="DATES" v={s.checkIn && s.checkOut ? `${s.checkIn} → ${s.checkOut}` : "--"} />
            <SettlementTile k="GUEST" v={s.customer?.name || "--"} />
          </div>
          <div className="mt-4 rounded-2xl px-4 py-3.5" style={{ border: "1px solid var(--line)" }}>
            <div className="mb-2 text-[10.5px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--mut)" }}>
              Settlement
            </div>
            {[
              { k: "Collected by OTA from guest", v: money(gross) },
              { k: "Less host service fee (commission)", v: `−${money(comm)}` },
              { k: "Less remitted occupancy tax (GST)", v: `−${money(occTax)}` },
              { k: "Less TDS deducted", v: `−${money(tds)}` },
            ].map((row) => (
              <div key={row.k} className="flex justify-between gap-2.5 py-1 text-[12.5px]">
                <span style={{ color: "var(--mut)" }}>{row.k}</span>
                <span className="font-bold tabular-nums">{row.v}</span>
              </div>
            ))}
            <div className="mt-1.5 flex justify-between gap-2.5 pt-2.5 text-[15px] font-extrabold" style={{ borderTop: "2px solid var(--txt)" }}>
              <span>Net payout expected</span>
              <span className="tabular-nums" style={{ color: "var(--green)" }}>
                {money(net)}
              </span>
            </div>
          </div>
          {s.ota.notes && (
            <div className="mt-3.5 rounded-2xl px-4 py-3" style={{ background: "var(--soft)", border: "1px solid var(--line)" }}>
              <div className="mb-1 text-[10.5px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--mut)" }}>
                Notes
              </div>
              <div className="whitespace-pre-wrap text-[13px] leading-[1.55]">{s.ota.notes}</div>
            </div>
          )}
        </div>
      )}

      <div className="px-8 pt-5">
        <div className="mb-2 text-[10.5px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--mut)" }}>
          What happens next
        </div>
        <div className="flex flex-col gap-1.5">
          {NEXT_STEPS[s.resType]?.map((line) => (
            <div key={line} className="flex items-start gap-2.5 text-[13px] leading-[1.5]">
              <span
                className="mt-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full text-[11px] font-extrabold"
                style={{ background: "var(--greenSoft)", color: "var(--green)" }}
              >
                ✓
              </span>
              <span style={{ color: "var(--mut)" }}>{line}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-8 mb-7 mt-5 flex flex-wrap gap-2.5 border-t pt-[18px]" style={{ borderColor: "var(--line)" }}>
        <button onClick={resetAll} className="rounded-xl px-[18px] py-2.5 text-[13px] font-extrabold" style={{ background: "var(--acc)", color: "var(--accOn)" }}>
          {CTA_LABEL[s.resType]}
        </button>
        <button onClick={() => router.push("/admin/bookings")} className="rounded-xl px-[18px] py-2.5 text-[13px] font-extrabold" style={{ background: "var(--card)", border: "1px solid var(--line)", color: "var(--txt)" }}>
          Go to dashboard →
        </button>
      </div>
    </div>
  );
}

function SettlementTile({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="flex-1 rounded-[14px] px-3.5 py-3" style={{ minWidth: 150, background: "var(--soft)", border: "1px solid var(--line)" }}>
      <div className="text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--mut)" }}>
        {k}
      </div>
      <div className="mt-1 text-[14px] font-extrabold" style={{ textWrap: "pretty" as any }}>
        {v}
      </div>
      {sub && (
        <div className="mt-0.5 text-[11.5px]" style={{ color: "var(--mut)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}
