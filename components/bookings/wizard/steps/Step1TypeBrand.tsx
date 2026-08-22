"use client";

import { useEffect, useRef } from "react";
import { resolveCommissionSourceId, useWizard } from "../WizardContext";
import { StaggerGroup } from "../WizardBits";
import { ChipButton, FieldLabel, inputCls, inputStyle } from "./FieldBits";
import { slideIndicator } from "../gsapHelpers";
import type { ReservationType, SourceKind } from "../types";

function Icon({ d }: { d: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const TYPE_DEFS: Array<{ k: ReservationType; title: string; desc: string; d: string }> = [
  {
    k: "guest",
    title: "New Assisted Reservation",
    desc: "Create a reservation for guests staying at your property.",
    d: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1",
  },
  {
    k: "owner",
    title: "Completed OTA Booking",
    desc: "Log a booking already confirmed on an OTA channel.",
    d: "M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9.5 21v-6h5v6",
  },
  {
    k: "block",
    title: "Blocking",
    desc: "Inventory-only operational block, no guest attached.",
    d: "M5.6 5.6a9 9 0 1 0 12.8 12.8A9 9 0 0 0 5.6 5.6zm0 0 12.8 12.8",
  },
];

const SOURCE_DEFS: Array<{ id: string; label: string; kind: SourceKind; mark: string; desc: string; keywords: string[] }> = [
  { id: "src_direct", label: "Direct", kind: "DIRECT", mark: "DR", desc: "Guest reached out directly — phone, WhatsApp, website or walk-in.", keywords: ["direct"] },
  { id: "src_owner_ref", label: "Owner Referral", kind: "DIRECT", mark: "OR", desc: "Referred by the property owner or their network.", keywords: ["owner referral", "owner-referral", "referral", "owner"] },
  { id: "src_agent", label: "Third Party Travel Agent", kind: "TRAVEL_AGENT", mark: "TA", desc: "Booked through an external travel agent or partner.", keywords: ["travel agent", "agent", "third party"] },
];

const PURPOSE_DEFS: Array<{ k: string; title: string; desc: string; d: string }> = [
  { k: "friends", title: "Night Stay – Friends", desc: "Casual group getaway", d: "M14 19a6 6 0 0 0-12 0M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 19a5 5 0 0 0-7-4.58M16 3.13a4 4 0 0 1 0 7.75" },
  { k: "family", title: "Night Stay – Family", desc: "Kids, elders — comfort-first", d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
  { k: "event", title: "Event", desc: "Wedding, party, function", d: "M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7S9 2 6.5 4 12 7 12 7zM12 7s3-5 5.5-3S12 7 12 7z" },
  { k: "corporate", title: "Corporate Outing", desc: "Offsites · GST invoice · AV setup", d: "M6 21V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14M6 21H3M6 21h12m0 0h3M10 9h4m-4 4h4m-4 4h4" },
  { k: "shooting", title: "Shooting", desc: "Film, photo or content shoot", d: "M23 7l-7 5 7 5V7zM1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1z" },
  { k: "other", title: "Others", desc: "Something else — tell us", d: "M12 3l2.4 5.4L20 9l-4 4 1 6-5-2.8L7 19l1-6-4-4 5.6-.6z" },
];

const EVENT_OPTIONS = ["Wedding", "Reception", "Sangeet / Cocktail", "Engagement", "Birthday", "Anniversary", "Conference", "Corporate gala", "Concert / Performance", "Other"];

// Matches the design mock's own `syncBrandInd()` -- the sliding indicator's
// fill color is per-brand (green for InstaFarms, blue for Mago), not the
// generic accent color.
function brandColorFor(name: string): string {
  return name.toLowerCase().includes("mago") ? "#2563eb" : "#16a34a";
}

export default function Step1TypeBrand() {
  const { s, patch, brands, commissionSources } = useWizard();
  const brandIndRef = useRef<HTMLDivElement | null>(null);
  const brandPillRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const brandSeenRef = useRef(false);

  useEffect(() => {
    const el = brandPillRefs.current[s.brandId];
    slideIndicator(brandIndRef.current, el || null, brandSeenRef.current, brandColorFor(s.brandName));
    if (el) brandSeenRef.current = true;
  }, [s.brandId, s.brandName, brands]);

  const pickSource = (d: (typeof SOURCE_DEFS)[number]) => {
    const sourceCategory = d.kind === "TRAVEL_AGENT" ? "THIRD_PARTY_BOOKING" : "DIRECT_BOOKING";
    const commissionBookingSourceId = resolveCommissionSourceId(commissionSources, d.keywords);
    patch({ pickedSourceId: d.id, sourceKind: d.kind, sourceCategory, commissionBookingSourceId });
  };
  const pickedSourceDef = SOURCE_DEFS.find((d) => d.id === s.pickedSourceId);
  const sourceUnresolved = !!pickedSourceDef && !s.commissionBookingSourceId;

  const toggleOccasion = (opt: string) => {
    patch({ occasions: s.occasions.includes(opt) ? s.occasions.filter((o) => o !== opt) : [...s.occasions, opt] });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-extrabold tracking-[0.16em]" style={{ color: "var(--mut)" }}>
          BRAND
        </span>
        <div className="relative flex gap-0.5 rounded-full p-[3px]" style={{ background: "var(--card)", border: "1px solid var(--line)", boxShadow: "var(--shadow)" }}>
          <div
            ref={brandIndRef}
            className="pointer-events-none absolute rounded-full"
            style={{ top: 3, left: 0, height: "calc(100% - 6px)", width: 0, background: "var(--acc)", opacity: 0 }}
          />
          {brands.map((b) => {
            const on = s.brandId === b.id;
            return (
              <button
                key={b.id}
                ref={(el) => {
                  brandPillRefs.current[b.id] = el;
                }}
                type="button"
                onClick={() => patch({ brandId: b.id, brandName: b.name })}
                className="relative rounded-full px-4 py-1.5 text-[13px] font-bold transition"
                style={{ color: on ? "var(--accOn)" : "var(--txt)" }}
              >
                {b.name}
              </button>
            );
          })}
          {brands.length === 0 && (
            <span className="relative px-3 py-1.5 text-[13px]" style={{ color: "var(--mut)" }}>
              No brands available
            </span>
          )}
        </div>
        <span className="text-[11.5px]" style={{ color: "var(--mut)" }}>
          Sets pricing, taxes and confirmation template for this reservation.
        </span>
      </div>

      <StaggerGroup className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }} triggerKey="step1-type">
        {TYPE_DEFS.map((t) => {
          const on = s.resType === t.k;
          return (
            <div
              key={t.k}
              onClick={() => patch({ resType: t.k, maxStep: 1 })}
              className="cursor-pointer rounded-2xl p-4"
              style={{
                background: on ? "var(--accSoft)" : "var(--card)",
                border: `1px solid ${on ? "var(--acc)" : "var(--line)"}`,
                boxShadow: "var(--shadow)",
                transition: "background .2s ease, border-color .2s ease",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px]"
                  style={{
                    background: on ? "var(--acc)" : "var(--soft)",
                    color: on ? "var(--accOn)" : "var(--mut)",
                    transition: "background .2s ease, color .2s ease",
                  }}
                >
                  <Icon d={t.d} />
                </div>
                <div
                  className="flex h-5 w-5 flex-none items-center justify-center rounded-full text-[12px] font-extrabold"
                  style={{
                    background: "var(--acc)",
                    color: "var(--accOn)",
                    transform: on ? "scale(1)" : "scale(0)",
                    opacity: on ? 1 : 0,
                    transition: "transform .3s cubic-bezier(.34,1.56,.64,1), opacity .2s ease",
                  }}
                >
                  ✓
                </div>
              </div>
              <div className="mt-3 text-[15px] font-extrabold">{t.title}</div>
              <div className="mt-0.5 text-[12.5px] leading-[1.45]" style={{ color: "var(--mut)" }}>
                {t.desc}
              </div>
            </div>
          );
        })}
      </StaggerGroup>

      {s.resType === "guest" && (
        <>
          <div className="ibw-card ibw-fade-up p-5">
            <div className="mb-1 text-[12px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "var(--mut)" }}>
              Booking source
            </div>
            <div className="mb-3 text-[12.5px]" style={{ color: "var(--mut)" }}>
              Where did this booking come from? Sets the source kind on the reservation.
            </div>
            <StaggerGroup className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }} triggerKey="step1-source">
              {SOURCE_DEFS.map((d) => {
                const on = s.pickedSourceId === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => pickSource(d)}
                    className="cursor-pointer rounded-2xl p-3.5"
                    style={{ background: "var(--card)", border: `1px solid ${on ? "var(--acc)" : "var(--line)"}`, boxShadow: on ? "var(--shadow)" : "none" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] text-[12px] font-extrabold"
                        style={{ background: on ? "var(--acc)" : "var(--soft)", color: on ? "var(--accOn)" : "var(--mut)" }}
                      >
                        {d.mark}
                      </div>
                      <div className="min-w-0 flex-1 text-[14px] font-extrabold">{d.label}</div>
                      <span
                        className="flex h-5 w-5 flex-none items-center justify-center rounded-full text-[12px] font-extrabold transition"
                        style={{ background: "var(--acc)", color: "var(--accOn)", transform: on ? "scale(1)" : "scale(0)", opacity: on ? 1 : 0 }}
                      >
                        ✓
                      </span>
                    </div>
                    <div className="mt-2 text-[12px] leading-[1.5]" style={{ color: "var(--mut)" }}>
                      {d.desc}
                    </div>
                  </div>
                );
              })}
            </StaggerGroup>

            {sourceUnresolved && commissionSources.length === 0 && (
              <div className="ibw-fade-up mt-3 rounded-xl px-3.5 py-2.5 text-[12.5px] font-bold" style={{ background: "var(--badSoft)", color: "var(--bad)" }}>
                No commission sources are configured under Source &amp; Commission settings at all — set one up before continuing, the
                reservation can't be created.
              </div>
            )}

            {sourceUnresolved && commissionSources.length > 0 && (
              <div className="ibw-fade-up mt-3 rounded-xl px-3.5 py-2.5" style={{ background: "var(--amberSoft)" }}>
                <FieldLabel required>Commission source</FieldLabel>
                <div className="mb-1.5 text-[11.5px] font-semibold" style={{ color: "var(--amber)" }}>
                  Couldn't auto-match one named "{pickedSourceDef!.label}" — pick the right one manually.
                </div>
                <select
                  className={inputCls}
                  style={inputStyle}
                  value={s.commissionBookingSourceId}
                  onChange={(e) => patch({ commissionBookingSourceId: e.target.value })}
                >
                  <option value="">Select…</option>
                  {commissionSources.map((cs) => (
                    <option key={cs.id} value={cs.id}>
                      {cs.sourceName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {s.sourceKind === "TRAVEL_AGENT" && (
              <div className="ibw-fade-up mt-4 grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <div>
                  <FieldLabel required>Agent name</FieldLabel>
                  <input className={inputCls} style={inputStyle} value={s.agentName} onChange={(e) => patch({ agentName: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>Voucher number</FieldLabel>
                  <input className={inputCls} style={inputStyle} value={s.agentVoucher} onChange={(e) => patch({ agentVoucher: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>Commission terms</FieldLabel>
                  <textarea rows={2} className={inputCls} style={{ ...inputStyle, resize: "vertical" }} value={s.agentCommTerms} onChange={(e) => patch({ agentCommTerms: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>Settlement terms</FieldLabel>
                  <textarea rows={2} className={inputCls} style={{ ...inputStyle, resize: "vertical" }} value={s.agentSettleTerms} onChange={(e) => patch({ agentSettleTerms: e.target.value })} />
                </div>
              </div>
            )}
          </div>

          <div className="ibw-card ibw-fade-up p-5">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mut)" }}>
              Reasons <span style={{ color: "var(--bad)" }}>*</span>
            </div>
            <div className="mb-3 text-[12.5px]" style={{ color: "var(--mut)" }}>
              One pick. Everything else below adapts to what you pick.
            </div>
            <StaggerGroup className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(6, 1fr)" }} triggerKey="step1-purpose">
              {PURPOSE_DEFS.map((p) => {
                const on = s.tripPurpose === p.k;
                return (
                  <div
                    key={p.k}
                    onClick={() => patch({ tripPurpose: p.k, occasions: [], occasionOther: "" })}
                    className="cursor-pointer rounded-2xl p-3.5"
                    style={{ background: on ? "var(--accSoft)" : "var(--card)", border: `1px solid ${on ? "var(--acc)" : "var(--line)"}` }}
                  >
                    <div
                      className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px]"
                      style={{ background: on ? "var(--acc)" : "var(--soft)", color: on ? "var(--accOn)" : "var(--acc)" }}
                    >
                      <Icon d={p.d} />
                    </div>
                    <div className="mt-2 text-[14px] font-bold">{p.title}</div>
                    <div className="mt-0.5 text-[11.5px]" style={{ color: "var(--mut)" }}>
                      {p.desc}
                    </div>
                  </div>
                );
              })}
            </StaggerGroup>
            {s.tripPurpose === "other" && (
              <input
                className={inputCls}
                style={{ ...inputStyle, marginTop: 12, maxWidth: 440 }}
                value={s.purposeOther}
                onChange={(e) => patch({ purposeOther: e.target.value })}
                placeholder="What is the stay for? (required)"
              />
            )}
          </div>

          {s.tripPurpose === "event" && (
            <div className="ibw-card ibw-fade-up p-5">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mut)" }}>
                Event <span style={{ color: "var(--bad)" }}>*</span>
              </div>
              <div className="mb-3 text-[12.5px]" style={{ color: "var(--mut)" }}>
                Pick all that apply — drives event pricing, capacity checks and the ops plan.
              </div>
              <StaggerGroup className="flex flex-wrap gap-2" triggerKey="step1-event-ctx">
                {EVENT_OPTIONS.map((o) => (
                  <ChipButton key={o} active={s.occasions.includes(o)} onClick={() => toggleOccasion(o)}>
                    {o}
                  </ChipButton>
                ))}
              </StaggerGroup>
              {s.occasions.includes("Other") && (
                <input
                  className={inputCls}
                  style={{ ...inputStyle, marginTop: 12, maxWidth: 440 }}
                  value={s.occasionOther}
                  onChange={(e) => patch({ occasionOther: e.target.value })}
                  placeholder="Tell us the event… (required)"
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
