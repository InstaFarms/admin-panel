"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useWizard, money } from "../WizardContext";
import { useWizardProperties } from "../useWizardProperties";
import { StaggerGroup, Spinner } from "../WizardBits";
import { inputCls, inputStyle } from "./FieldBits";
import type { PropertyLite } from "../types";

// The property grid is `repeat(auto-fill, minmax(GRID_MIN_COL_PX, 1fr))` with
// a GRID_GAP_PX gap -- the actual column count depends on the container's
// width, so "rows" for pagination purposes has to track it live (via
// useGridColumns below) rather than assume a fixed count. Otherwise "See
// more" can reveal a short trailing row instead of a full one.
const GRID_MIN_COL_PX = 270;
const GRID_GAP_PX = 14;
const ROWS_INITIAL = 2;
const ROWS_INCREMENT = 4;

/** Mirrors the CSS auto-fill column count for a `minmax(minColPx, 1fr)` grid. */
function useGridColumns(minColPx: number, gapPx: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Rely solely on ResizeObserver's own callback rather than an upfront
    // getBoundingClientRect() read -- the observer's first delivery is
    // guaranteed to reflect real post-layout size, whereas reading the rect
    // synchronously right after mount can race the browser's layout pass
    // (observed returning 0/undersized on first paint, undercounting columns).
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (typeof width !== "number" || width <= 0) return;
      setColumns(Math.max(1, Math.floor((width + gapPx) / (minColPx + gapPx))));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [minColPx, gapPx]);

  return { ref, columns };
}

const AREAS = ["All areas", "Shankarpally", "Moinabad", "Gandipet", "Shamirpet"];
const TYPES = ["All types", "Farmhouse", "Villa"];
const CAPS = ["Any size", "8+ guests", "12+ guests", "16+ guests"];
const BUDGETS = ["Any budget", "Under ₹10k", "₹10k–15k", "₹15k+"];
const SORTS = [
  { v: "recommended", label: "Recommended" },
  { v: "priceAsc", label: "Price: low to high" },
  { v: "priceDesc", label: "Price: high to low" },
  { v: "capacity", label: "Capacity" },
];

function matchesCap(p: PropertyLite, filter: string) {
  if (filter === "Any size") return true;
  const min = Number(filter.replace(/\D/g, ""));
  return (p.maxGuests || 0) >= min;
}
function matchesBudget(p: PropertyLite, filter: string) {
  if (filter === "Any budget") return true;
  const rate = p.rate || 0;
  if (filter === "Under ₹10k") return rate < 10000;
  if (filter === "₹10k–15k") return rate >= 10000 && rate <= 15000;
  return rate > 15000;
}

export default function Step4Property() {
  const { s, patch } = useWizard();
  const { properties, loading } = useWizardProperties(s.brandName);
  const [visibleRows, setVisibleRows] = useState(ROWS_INITIAL);
  const { ref: gridRef, columns } = useGridColumns(GRID_MIN_COL_PX, GRID_GAP_PX);

  const filtered = useMemo(() => {
    let list = properties.filter((p) => {
      if (s.propQ.trim()) {
        const q = s.propQ.trim().toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !(p.code || "").toLowerCase().includes(q)) return false;
      }
      if (s.fArea !== "All areas" && p.area !== s.fArea) return false;
      if (s.fType !== "All types" && p.propertyType !== s.fType) return false;
      if (!matchesCap(p, s.fCap)) return false;
      if (!matchesBudget(p, s.fBudget)) return false;
      return true;
    });
    if (s.propSort === "priceAsc") list = [...list].sort((a, b) => (a.rate || 0) - (b.rate || 0));
    if (s.propSort === "priceDesc") list = [...list].sort((a, b) => (b.rate || 0) - (a.rate || 0));
    if (s.propSort === "capacity") list = [...list].sort((a, b) => (b.maxGuests || 0) - (a.maxGuests || 0));
    return list;
  }, [properties, s.propQ, s.fArea, s.fType, s.fCap, s.fBudget, s.propSort]);

  // Reset pagination whenever the filtered set changes underneath it.
  useEffect(() => {
    setVisibleRows(ROWS_INITIAL);
  }, [s.propQ, s.fArea, s.fType, s.fCap, s.fBudget, s.propSort]);

  const visibleCount = visibleRows * columns;
  const visibleProps = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const pick = (p: PropertyLite) => patch({ propertyId: p.id, property: p });

  const areaPins = useMemo(() => {
    const byArea = new Map<string, number[]>();
    filtered.forEach((p) => {
      if (!p.area || !p.rate) return;
      byArea.set(p.area, [...(byArea.get(p.area) || []), p.rate]);
    });
    return Array.from(byArea.entries()).map(([area, rates]) => ({
      area,
      avgRate: Math.round(rates.reduce((a, b) => a + b, 0) / rates.length),
    }));
  }, [filtered]);

  const capWarnActive = !!s.property && (s.property.maxGuests || 0) > 0 && s.adults + s.children + s.infants > (s.property.maxGuests as number);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl px-3.5 py-2.5 text-[12.5px] font-semibold" style={{ background: "var(--blueSoft)", color: "var(--blue)" }}>
        <b>Core (works today):</b> the searchable property list below, backed by the real property directory. <b>Proposed enhancement:</b> the
        area/type/capacity/budget filters and map view are layered on top for this pass -- see docs for what's illustrative vs. live.
      </div>

      <div className="ibw-card p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            className={inputCls}
            style={{ ...inputStyle, flex: 2, minWidth: 200 }}
            value={s.propQ}
            onChange={(e) => patch({ propQ: e.target.value })}
            placeholder="Search by property name or code…"
          />
          <select className={inputCls} style={{ ...inputStyle, flex: 1, minWidth: 130 }} value={s.fArea} onChange={(e) => patch({ fArea: e.target.value })}>
            {AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <select className={inputCls} style={{ ...inputStyle, flex: 1, minWidth: 120 }} value={s.fType} onChange={(e) => patch({ fType: e.target.value })}>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select className={inputCls} style={{ ...inputStyle, flex: 1, minWidth: 110 }} value={s.fCap} onChange={(e) => patch({ fCap: e.target.value })}>
            {CAPS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select className={inputCls} style={{ ...inputStyle, flex: 1, minWidth: 120 }} value={s.fBudget} onChange={(e) => patch({ fBudget: e.target.value })}>
            {BUDGETS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
          <select className={inputCls} style={{ ...inputStyle, flex: 1, minWidth: 150 }} value={s.propSort} onChange={(e) => patch({ propSort: e.target.value })}>
            {SORTS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="flex overflow-hidden rounded-xl" style={{ border: "1px solid var(--line)" }}>
            {(["list", "map"] as const).map((v) => (
              <button
                key={v}
                onClick={() => patch({ propView: v })}
                className="px-3.5 py-2 text-[12.5px] font-bold capitalize"
                style={{ background: s.propView === v ? "var(--acc)" : "var(--card)", color: s.propView === v ? "var(--accOn)" : "var(--txt)" }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && <Spinner label="Loading properties…" />}

      {!loading && s.propView === "list" && (
        <>
          <div ref={gridRef}>
          <StaggerGroup className="grid gap-3.5" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${GRID_MIN_COL_PX}px, 1fr))` }} triggerKey={visibleProps.length}>
            {visibleProps.map((p) => {
              const active = s.propertyId === p.id;
              const requested = s.adults + s.children + s.infants;
              const capWarn = requested > 0 && (p.maxGuests || 0) > 0 && requested > (p.maxGuests as number);
              return (
                <div
                  key={p.id}
                  className="rounded-2xl p-3.5"
                  style={{ border: active ? "2px solid var(--acc)" : "1px solid var(--line)", background: "var(--card)", boxShadow: "var(--shadow)" }}
                >
                  <div
                    className="relative mb-2.5 flex h-[110px] items-center justify-center overflow-hidden rounded-xl font-mono text-[11px]"
                    style={{
                      color: "var(--mut)",
                      background: p.imageUrl ? "var(--soft)" : "repeating-linear-gradient(45deg, var(--soft), var(--soft) 10px, var(--line) 10px, var(--line) 11px)",
                    }}
                  >
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      "property photo"
                    )}
                  </div>
                  {capWarn && (
                    <div className="mb-2 rounded-lg px-2.5 py-1.5 text-[11px] font-bold" style={{ background: "var(--amberSoft)", color: "var(--amber)" }}>
                      Max {p.maxGuests} guests — {requested} requested
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex-1 text-[14.5px] font-extrabold">{p.name}</div>
                    {p.code && (
                      <span className="rounded-md px-1.5 py-0.5 font-mono text-[10.5px]" style={{ background: "var(--soft)", border: "1px solid var(--line)" }}>
                        {p.code}
                      </span>
                    )}
                  </div>
                  <div className="my-1 text-[12px]" style={{ color: "var(--mut)" }}>
                    {[p.area, p.city].filter(Boolean).join(", ") || "—"}
                  </div>
                  <div className="mb-2.5 flex flex-wrap gap-1.5">
                    <span className="rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ background: "var(--soft)" }}>
                      Base {p.baseGuests ?? "—"}
                    </span>
                    <span className="rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ background: "var(--soft)" }}>
                      Max {p.maxGuests ?? "—"}
                    </span>
                    <span className="rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ background: "var(--accSoft)", color: "var(--accInk)" }}>
                      {p.rate ? `from ${money(p.rate)}/night` : "rate on request"}
                    </span>
                  </div>
                  <button
                    onClick={() => pick(p)}
                    className="w-full rounded-[10px] py-2 text-[12.5px] font-extrabold"
                    style={{ background: active ? "var(--acc)" : "var(--soft)", color: active ? "var(--accOn)" : "var(--txt)" }}
                  >
                    {active ? "✓ Selected" : "Select property"}
                  </button>
                </div>
              );
            })}
          </StaggerGroup>
          </div>
          {hasMore && (
            <button
              onClick={() => setVisibleRows((v) => v + ROWS_INCREMENT)}
              className="rounded-xl py-2.5 text-[12.5px] font-extrabold"
              style={{ background: "var(--soft)", border: "1px solid var(--line)" }}
            >
              See more ({filtered.length - visibleCount} more)
            </button>
          )}
          {filtered.length === 0 && (
            <div className="rounded-xl px-4 py-3 text-[13px] font-semibold" style={{ background: "var(--amberSoft)", color: "var(--amber)" }}>
              No properties match these filters -- clear a filter or search by code.
            </div>
          )}
        </>
      )}

      {!loading && s.propView === "map" && (
        <div
          className="relative flex h-[340px] items-center justify-center overflow-hidden rounded-2xl font-mono text-[12px]"
          style={{
            border: "1px solid var(--line)",
            color: "var(--mut)",
            background: "repeating-linear-gradient(45deg, var(--soft), var(--soft) 14px, var(--card) 14px, var(--card) 15px)",
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">map view — drop real map tiles here (stretch goal)</div>
          {areaPins.map((pin, i) => (
            <div
              key={pin.area}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ left: `${18 + (i % 4) * 22}%`, top: `${28 + Math.floor(i / 4) * 32}%` }}
            >
              <div className="mx-auto mb-1 h-2.5 w-2.5 rounded-full" style={{ background: "var(--acc)" }} />
              <div className="rounded-[10px] px-2.5 py-1.5 text-[11.5px] font-bold" style={{ background: "var(--card)", border: "1px solid var(--line)", boxShadow: "var(--shadow)" }}>
                {pin.area}
                <div className="text-[11px]" style={{ color: "var(--acc)" }}>
                  avg {money(pin.avgRate)}/n
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {s.property && !capWarnActive && (
        <div className="ibw-fade-up rounded-xl px-3.5 py-2.5 text-[12.5px] font-bold" style={{ background: "var(--greenSoft)", color: "var(--green)" }}>
          ✓ {s.property.name} selected. Exact per-night pricing will be confirmed on the Stay Details step.
        </div>
      )}
      {s.property && capWarnActive && (
        <div className="ibw-fade-up rounded-xl px-3.5 py-2.5 text-[12.5px] font-bold" style={{ background: "var(--amberSoft)", color: "var(--amber)" }}>
          ⚠ {s.property.name} sleeps up to {s.property.maxGuests} — {s.adults + s.children + s.infants} guests are currently set. Adjust the
          guest count on the Stay Details step.
        </div>
      )}
    </div>
  );
}
