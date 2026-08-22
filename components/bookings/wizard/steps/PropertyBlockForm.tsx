"use client";

import { useEffect, useState } from "react";
import { useWizard } from "../WizardContext";
import { useWizardProperties } from "../useWizardProperties";
import { searchCustomer, createCustomer } from "@/actions/customerActions";
import { getPropertyResortRooms, type ResortRoom } from "@/actions/resortRoomActions";
import type { CustomerData } from "@/utils/types";
import { useDebouncedCallback } from "@/utils/debounce";
import { FieldLabel, inputCls, inputStyle } from "./FieldBits";
import { getBlockingReasonsForProperty } from "@/actions/bookingActions";
import StayCalendar from "./StayCalendar";

const FALLBACK_REASONS = [
  { v: "MAINTENANCE", label: "Maintenance / repair" },
  { v: "RENOVATION", label: "Renovation" },
  { v: "PHOTOSHOOT", label: "Photoshoot / content" },
  { v: "INTERNAL_USE", label: "Internal team use" },
  { v: "OTHER", label: "Other" },
];

const DURATIONS = [
  { v: "half_day", label: "Half day" },
  { v: "1_night", label: "1 night" },
  { v: "2_nights", label: "2 nights" },
  { v: "custom", label: "Custom" },
];

function useBlockingReasons(propertyId: string | null, brandId: string) {
  const [reasons, setReasons] = useState<Array<{ v: string; label: string }>>(FALLBACK_REASONS);
  useEffect(() => {
    if (!propertyId) {
      setReasons(FALLBACK_REASONS);
      return;
    }
    let cancelled = false;
    getBlockingReasonsForProperty(propertyId, brandId)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray((res as any)?.success) ? (res as any).success : [];
        if (list.length) {
          // Real rows from BookingService.getBlockingReasonsForProperty are
          // { id, reason, description, ... } -- the display text lives in
          // `reason`, not `label`/`value`. Falling through to String(r) for
          // an object gives the literal text "[object Object]".
          setReasons(
            list.map((r: any) =>
              typeof r === "string"
                ? { v: r, label: r }
                : { v: String(r.id ?? r.value ?? r.reason ?? r.label ?? ""), label: String(r.reason ?? r.label ?? r.value ?? "") },
            ),
          );
        } else {
          setReasons(FALLBACK_REASONS);
        }
      })
      .catch(() => setReasons(FALLBACK_REASONS));
    return () => {
      cancelled = true;
    };
  }, [propertyId, brandId]);
  return reasons;
}

function customerName(c: CustomerData): string {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed guest";
}

export default function PropertyBlockForm() {
  const { s, patch } = useWizard();
  const { properties, loading } = useWizardProperties(s.brandName);
  const reasons = useBlockingReasons(s.propertyId, s.brandId);
  const [results, setResults] = useState<CustomerData[]>([]);
  const [searching, setSearching] = useState(false);
  const [resortRooms, setResortRooms] = useState<ResortRoom[] | null>(null);
  const [showNotes, setShowNotes] = useState(false);

  // Matches /admin/bookings/blocking/create -- a Resort property blocks a
  // specific room, not the whole property. null = not a resort (or unknown
  // yet), [] = resort with no active rooms, non-empty = pick one.
  useEffect(() => {
    setResortRooms(null);
    patch({ blockIsResort: false, blockRoomId: null });
    if (!s.propertyId || !s.brandId) return;
    let cancelled = false;
    getPropertyResortRooms(s.propertyId, s.brandId).then(({ rooms }) => {
      if (cancelled) return;
      setResortRooms(rooms);
      // The backend's /properties/{id}/rooms endpoint doesn't actually check
      // whether the property is a Resort -- it just queries resortRooms by
      // propertyId, so a normal property returns 200 with an empty array,
      // not an error. `rooms !== null` is therefore true for EVERY property
      // and would wrongly require a room on plain farmhouses/villas. The
      // only reliable signal available is "does it actually have rooms
      // configured" -- so only require a room when there's at least one.
      patch({ blockIsResort: (rooms?.length ?? 0) > 0, blockRoomId: null });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.propertyId, s.brandId]);

  const runSearch = useDebouncedCallback((q: string) => {
    if (!q.trim() || q.trim().length < 2) {
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
  }, 400);

  const nights = s.checkIn && s.checkOut ? Math.round((+new Date(s.checkOut) - +new Date(s.checkIn)) / 86400000) : 0;

  const saveBlockCustomer = async () => {
    const [firstName, ...rest] = s.blockCustName.trim().split(/\s+/);
    if (!firstName || !s.blockCustPhone.trim()) return;
    const fd = new FormData();
    fd.set("firstName", firstName);
    fd.set("lastName", rest.join(" "));
    fd.set("mobileNumber", s.blockCustPhone.trim());
    fd.set("email", s.blockCustEmail.trim());
    const res = await createCustomer(fd, { brandName: s.brandName });
    if (res.error) return;
    const lookup = new FormData();
    lookup.set("searchKey", "Mobile");
    lookup.set("searchValue", s.blockCustPhone.trim());
    const found = await searchCustomer(lookup, { brandName: s.brandName });
    const match = found.data?.find((c) => c.mobileNumber === s.blockCustPhone.trim());
    patch({ blockNewCust: false, blockCustId: match?.id || null, blockCustName: match ? customerName(match) : s.blockCustName });
  };

  const hasProperty = !!s.propertyId;
  const hasSelection = !!s.checkIn;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl px-4 py-3 text-[12.5px] font-bold" style={{ background: "var(--amberSoft)", color: "var(--amber)" }}>
        Operational block only — the dates are held on the calendar with no payment or invoice attached.
      </div>

      <div className="grid items-start gap-5" style={{ gridTemplateColumns: "minmax(0, 1fr) 360px" }}>
        <div className="ibw-card min-w-0 p-[22px]">
          <div className="text-[18px] font-extrabold tracking-tight">Create Blocking</div>
          <div className="mb-4.5 mt-1 max-w-[520px] text-[13px] leading-[1.5]" style={{ color: "var(--mut)", marginBottom: 18 }}>
            Pick a property, choose dates on the calendar, then classify the block. Reserved dates apply to inventory immediately.
          </div>
          <div className="mb-4.5" style={{ marginBottom: 18 }}>
            <FieldLabel required>Property</FieldLabel>
            <select
              className={inputCls}
              style={{ ...inputStyle, maxWidth: 420 }}
              value={s.propertyId || ""}
              onChange={(e) => {
                const p = properties.find((x) => x.id === e.target.value) || null;
                // Blocked dates are property-specific -- a selection made
                // against the previous property isn't valid here.
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

          {resortRooms !== null && resortRooms.length > 0 && (
            <div className="ibw-fade-up mb-4.5" style={{ marginBottom: 18 }}>
              <FieldLabel required>
                Room <span className="font-normal" style={{ color: "var(--acc)" }}>(Resort property — select a room to block)</span>
              </FieldLabel>
              <select
                name="roomId"
                className={inputCls}
                style={{ ...inputStyle, maxWidth: 420 }}
                value={s.blockRoomId || ""}
                onChange={(e) => patch({ blockRoomId: e.target.value || null })}
              >
                <option value="">— Select a room —</option>
                {resortRooms.filter((r) => r.isActive).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.roomNumber} — {r.roomName} ({r.roomType}, max {r.maxGuestCount} guests)
                  </option>
                ))}
              </select>
            </div>
          )}

          {hasProperty ? (
            <StayCalendar variant="block" />
          ) : (
            <div className="rounded-2xl p-4 text-center text-[12.5px] font-semibold" style={{ background: "var(--blueSoft)", color: "var(--blue)" }}>
              Pick a property above to see its real availability and select dates to block.
            </div>
          )}
        </div>

        <aside style={{ position: "sticky", top: 20 }}>
          {!hasProperty && (
            <EmptyPanel icon="🏷️" title="Select a property" desc="Choose a property above to load its availability calendar." />
          )}

          {hasProperty && !hasSelection && (
            <EmptyPanel icon="📅" title="Pick dates to block" desc="Click a start date on the calendar, then an end date to create a range." />
          )}

          {hasProperty && hasSelection && (
            <div className="ibw-card ibw-fade-up min-w-0 p-[18px]">
              <div className="mb-4.5 rounded-xl px-4 py-3.5" style={{ background: "var(--soft)", border: "1px solid var(--line)", marginBottom: 18 }}>
                <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "var(--acc)" }}>
                  Selected dates
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="min-w-0 flex-1 text-[16px] font-extrabold">{s.checkOut ? `${s.checkIn} → ${s.checkOut}` : `${s.checkIn} → …`}</div>
                  {nights > 0 && (
                    <span className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-bold" style={{ background: "var(--accSoft)", color: "var(--accInk)" }}>
                      {nights} night{nights === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <button onClick={() => patch({ checkIn: null, checkOut: null })} className="pt-2 text-[12px]" style={{ color: "var(--mut)" }}>
                  Clear selection
                </button>
              </div>

              <div className="mb-2 text-[12.5px] font-bold">
                Blocking type <span style={{ color: "var(--bad)" }}>*</span>
              </div>
              <div className="mb-4.5 flex gap-2" style={{ marginBottom: 18 }}>
                {[
                  { k: "temp" as const, label: "Temporary" },
                  { k: "perm" as const, label: "Permanent" },
                ].map((m) => {
                  const on = s.blockMode === m.k;
                  return (
                    <button
                      key={m.k}
                      onClick={() => patch({ blockMode: m.k })}
                      className="flex-1 rounded-xl py-2.5 text-[13px] font-extrabold"
                      style={{ background: on ? "var(--acc)" : "var(--soft)", color: on ? "var(--accOn)" : "var(--txt)", border: on ? "none" : "1px solid var(--line)" }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>

              {s.blockMode === "temp" && (
                <div className="ibw-fade-up mb-4">
                  <div className="mb-2 text-[12.5px] font-bold">
                    Duration <span style={{ color: "var(--bad)" }}>*</span>
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    {DURATIONS.map((d) => {
                      const on = s.blockDuration === d.v;
                      return (
                        <button
                          key={d.v}
                          onClick={() => patch({ blockDuration: d.v })}
                          className="rounded-xl py-2.5 text-[12.5px] font-bold"
                          style={{ background: on ? "var(--acc)" : "var(--soft)", color: on ? "var(--accOn)" : "var(--txt)", border: on ? "none" : "1px solid var(--line)" }}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mb-0.5 text-[12.5px] font-bold">
                    Customer details <span style={{ color: "var(--bad)" }}>*</span>
                  </div>
                  <div className="mb-2.5 text-[11.5px]" style={{ color: "var(--mut)" }}>
                    Who the temporary hold is for.
                  </div>
                  <div style={{ position: "relative" }}>
                    {s.blockCustId ? (
                      <div className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5" style={{ background: "var(--accSoft)", border: "1px solid var(--acc)" }}>
                        <div className="min-w-0 flex-1 text-[13px] font-extrabold">{s.blockCustName}</div>
                        <button onClick={() => patch({ blockCustId: null, blockCustName: "" })} className="text-[11.5px] font-extrabold" style={{ color: "var(--acc)" }}>
                          Change
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          className={inputCls}
                          style={inputStyle}
                          value={s.blockCustName}
                          onChange={(e) => {
                            patch({ blockCustName: e.target.value });
                            runSearch(e.target.value);
                          }}
                          placeholder="Search or type a name"
                        />
                        {!searching && results.length > 0 && (
                          <div className="ibw-card mt-1.5 overflow-hidden" style={{ position: "absolute", left: 0, right: 0, zIndex: 6 }}>
                            {results.map((c) => (
                              <div
                                key={c.id}
                                onClick={() => patch({ blockCustId: c.id, blockCustName: customerName(c), blockCustPhone: c.mobileNumber || "" })}
                                className="cursor-pointer px-3 py-2.5 text-[12.5px] font-bold"
                                style={{ borderTop: "1px solid var(--line)" }}
                              >
                                {customerName(c)} <span className="font-normal" style={{ color: "var(--mut)" }}>{c.mobileNumber}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {!searching && s.blockCustName.trim().length > 1 && results.length === 0 && (
                          <div className="ibw-card mt-1.5 p-2.5" style={{ position: "absolute", left: 0, right: 0, zIndex: 6 }}>
                            <button
                              onClick={() => patch({ blockNewCust: true })}
                              className="w-full rounded-[9px] py-2 text-[12px] font-extrabold"
                              style={{ background: "var(--acc)", color: "var(--accOn)" }}
                            >
                              + Add to customer database
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {s.blockNewCust && (
                    <div className="ibw-fade-up mt-3 rounded-[10px] p-3" style={{ background: "var(--soft)", border: "1px solid var(--acc)" }}>
                      <div className="mb-2.5 text-[12.5px] font-extrabold">New customer · {s.blockCustName}</div>
                      <div className="flex flex-col gap-2.5">
                        <input className={inputCls} style={inputStyle} value={s.blockCustPhone} onChange={(e) => patch({ blockCustPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="9000000000" />
                        <input className={inputCls} style={inputStyle} value={s.blockCustEmail} onChange={(e) => patch({ blockCustEmail: e.target.value })} placeholder="name@email.com" />
                        <input className={inputCls} style={inputStyle} value={s.blockCustCity} onChange={(e) => patch({ blockCustCity: e.target.value })} placeholder="Hyderabad" />
                        <div className="flex items-center gap-2">
                          <button onClick={saveBlockCustomer} className="rounded-[9px] px-3 py-2.5 text-[12px] font-extrabold" style={{ background: "var(--acc)", color: "var(--accOn)" }}>
                            Save customer
                          </button>
                          <button onClick={() => patch({ blockNewCust: false })} className="px-1 text-[12px] font-extrabold" style={{ color: "var(--mut)" }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {s.blockMode === "perm" && (
                <div className="mb-3.5">
                  <div className="mb-2 text-[12.5px] font-bold">
                    Blocking reason <span style={{ color: "var(--bad)" }}>*</span>
                  </div>
                  <div className="mb-2.5 flex flex-wrap gap-2">
                    {reasons.map((r) => {
                      const on = s.blockReason === r.v;
                      return (
                        <button
                          key={r.v}
                          onClick={() => patch({ blockReason: r.v })}
                          className="rounded-full px-3.5 py-2 text-[12.5px] font-bold"
                          style={{ background: on ? "var(--acc)" : "var(--soft)", color: on ? "var(--accOn)" : "var(--txt)", border: on ? "none" : "1px solid var(--line)" }}
                        >
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                  {s.blockReason === "OTHER" && (
                    <input
                      className={inputCls}
                      style={inputStyle}
                      value={s.blockReasonOther}
                      onChange={(e) => patch({ blockReasonOther: e.target.value })}
                      placeholder="Maintenance, renovation, owner hold…"
                    />
                  )}
                </div>
              )}

              {!showNotes ? (
                <button
                  onClick={() => setShowNotes(true)}
                  className="w-full rounded-xl py-2.5 text-[12.5px] font-bold"
                  style={{ background: "none", border: "1px dashed var(--line)", color: "var(--mut)" }}
                >
                  + Add reason notes <span style={{ opacity: 0.7 }}>(optional)</span>
                </button>
              ) : (
                <div>
                  <FieldLabel>Reason notes (optional)</FieldLabel>
                  <textarea
                    rows={3}
                    autoFocus
                    className={inputCls}
                    style={{ ...inputStyle, resize: "vertical" }}
                    value={s.internalNotes}
                    onChange={(e) => patch({ internalNotes: e.target.value })}
                    placeholder="Anything ops should know about this block…"
                  />
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function EmptyPanel({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="ibw-card ibw-fade-up p-9 text-center">
      <div
        className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-2xl text-[24px]"
        style={{ background: "var(--soft)", border: "1px solid var(--line)" }}
      >
        {icon}
      </div>
      <div className="text-[15px] font-extrabold">{title}</div>
      <div className="mt-2 text-[13px] leading-[1.5]" style={{ color: "var(--mut)" }}>
        {desc}
      </div>
    </div>
  );
}
