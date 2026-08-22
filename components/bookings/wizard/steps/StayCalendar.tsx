"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getPropertyAvailability } from "@/actions/bookingActions";
import { useWizard, money } from "../WizardContext";
import { Spinner, StaggerGroup } from "../WizardBits";

function iso(d: Date): string {
  // toISOString() converts to UTC first -- for IST (UTC+5:30) that turns local
  // midnight on the 12th into 18:30 on the 11th, so every calendar click landed
  // on the day before the one clicked. Format from local getters instead.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function isSameDay(a: Date, b: Date): boolean {
  return iso(a) === iso(b);
}

type Availability = { blockedDates: string[]; peakDates: Set<string>; minNights: number };

export default function StayCalendar({ collapsible = false, variant = "stay" }: { collapsible?: boolean; variant?: "stay" | "block" }) {
  const isBlock = variant === "block";
  const { s, patch } = useWizard();
  const [calOffset, setCalOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [avail, setAvail] = useState<Availability>({ blockedDates: [], peakDates: new Set(), minNights: 1 });
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!s.propertyId) return;
    let cancelled = false;
    setLoading(true);
    getPropertyAvailability(s.propertyId, s.brandId)
      .then((res) => {
        if (cancelled) return;
        const data = (res as any)?.success || {};
        const blocked: string[] = [
          ...(Array.isArray(data.blockedDates) ? data.blockedDates : []),
          ...(Array.isArray(data.bookedRanges)
            ? data.bookedRanges.flatMap((r: any) => expandRange(r.startDate || r.checkinDate, r.endDate || r.checkoutDate))
            : []),
        ];
        const peakRules = data?.minNightsInfo?.peakRules || [];
        const peakDates = new Set<string>();
        peakRules.forEach((rule: any) => {
          expandRange(rule.startDate, rule.endDate).forEach((d) => peakDates.add(d));
        });
        setAvail({ blockedDates: blocked, peakDates, minNights: data?.minNightsInfo?.universal || 1 });
      })
      .catch(() => setAvail({ blockedDates: [], peakDates: new Set(), minNights: 1 }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [s.propertyId, s.brandId, refreshTick]);

  useEffect(() => {
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  const months = useMemo(() => {
    const base = startOfMonth(addDays(new Date(), 0));
    base.setMonth(base.getMonth() + calOffset);
    return [0, 1].map((i) => new Date(base.getFullYear(), base.getMonth() + i, 1));
  }, [calOffset]);

  const rateFor = (d: Date): number => {
    const day = d.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    // Prefer the property's own rate for this specific weekday -- falling
    // back to the "from" rate (cheapest configured day) with a synthetic
    // weekend markup only when that day isn't individually priced. Using a
    // single cheapest-day rate for every cell was making the whole calendar
    // collapse to near-zero whenever any one weekday had a low/placeholder
    // price, since LEAST() across the week picks that one low value.
    const dayRate = s.property?.weeklyRates?.[day];
    let r: number;
    if (dayRate != null && dayRate > 0) {
      r = dayRate;
    } else {
      const base = s.property?.rate || 12000;
      r = day === 5 || day === 6 ? base * 1.35 : base;
    }
    if (avail.peakDates.has(iso(d))) r *= 1.5;
    return Math.round(r / 100) * 100;
  };

  const isBlocked = (d: Date) => avail.blockedDates.includes(iso(d));
  const isPast = (d: Date) => d < new Date(new Date().toDateString());

  // Price tiers across the two visible months -- days at/below 112% of the
  // cheapest visible rate are "lowest rate" (green), days at/above 90% of
  // the priciest visible rate are "high demand" (amber). Matches the design
  // mock's own loBand/hiBand banding exactly.
  const { loBand, hiBand } = useMemo(() => {
    const rates: number[] = [];
    months.forEach((m) => {
      const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      for (let dd = 1; dd <= daysInMonth; dd++) {
        const d = new Date(m.getFullYear(), m.getMonth(), dd);
        if (!isPast(d) && !isBlocked(d)) rates.push(rateFor(d));
      }
    });
    const lo = rates.length ? Math.min(...rates) : 0;
    const hi = rates.length ? Math.max(...rates) : 0;
    return { loBand: lo * 1.12, hiBand: hi * 0.9 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months, avail, s.property?.rate]);

  const inRange = (dIso: string) => {
    const start = s.checkIn;
    const end = s.checkOut || hover;
    if (!start || !end) return false;
    const [a, b] = start <= end ? [start, end] : [end, start];
    return dIso > a && dIso < b;
  };

  const selectDay = (d: Date) => {
    if (isPast(d) || isBlocked(d)) return;
    const dIso = iso(d);
    if (!s.checkIn || (s.checkIn && s.checkOut)) {
      patch({ checkIn: dIso, checkOut: null });
      setDragStart(dIso);
      draggingRef.current = true;
    } else if (dIso <= s.checkIn) {
      patch({ checkIn: dIso, checkOut: null });
      setDragStart(dIso);
      draggingRef.current = true;
    } else {
      patch({ checkOut: dIso });
      draggingRef.current = false;
    }
  };

  const dragEnter = (d: Date) => {
    if (!draggingRef.current) return;
    setHover(iso(d));
  };

  const finishDrag = () => {
    if (draggingRef.current && dragStart && hover && hover !== dragStart) {
      const [a, b] = dragStart <= hover ? [dragStart, hover] : [hover, dragStart];
      patch({ checkIn: a, checkOut: b });
    }
    draggingRef.current = false;
  };

  const nights = s.checkIn && s.checkOut ? Math.round((+new Date(s.checkOut) - +new Date(s.checkIn)) / 86400000) : 0;

  const quickPick = (kind: "tonight" | "weekend" | "3n") => {
    const today = new Date();
    for (let offset = 0; offset < 30; offset++) {
      const start = addDays(today, offset);
      if (isPast(start) || isBlocked(start)) continue;
      let n = kind === "3n" ? 3 : kind === "weekend" ? 2 : 1;
      if (kind === "weekend") {
        while (start.getDay() !== 5) start.setDate(start.getDate() + 1);
      }
      const end = addDays(start, n);
      let clean = true;
      for (let i = 0; i < n; i++) {
        if (isBlocked(addDays(start, i))) {
          clean = false;
          break;
        }
      }
      if (clean) {
        patch({ checkIn: iso(start), checkOut: iso(end) });
        return;
      }
    }
  };

  return (
    <div className="ibw-card p-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1">
          <div className="text-[15px] font-extrabold">{isBlock ? "Dates to block" : "Stay date range"}</div>
          <div className="text-[12.5px]" style={{ color: "var(--mut)" }}>
            {isBlock
              ? "Click a start date, then an end date -- or drag across a range to select what to block."
              : "Click check-in first, then check-out -- or drag across a range. Nightly rates shown inside each date."}
          </div>
        </div>
        {collapsible && (
          <button
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? "Expand calendar" : "Minimize calendar"}
            aria-label={collapsed ? "Expand calendar" : "Minimize calendar"}
            className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px]"
            style={{ background: "var(--soft)", border: "1px solid var(--line)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points={collapsed ? "6 9 12 15 18 9" : "18 15 12 9 6 15"} />
            </svg>
          </button>
        )}
        <button
          onClick={() => setRefreshTick((v) => v + 1)}
          className="rounded-[10px] px-3.5 py-2 text-[12.5px] font-bold"
          style={{ background: "var(--soft)", border: "1px solid var(--line)" }}
        >
          Refresh Calendar
        </button>
        <button
          onClick={() => patch({ checkIn: null, checkOut: null })}
          className="rounded-[10px] px-3.5 py-2 text-[12.5px] font-bold"
          style={{ background: "var(--soft)", border: "1px solid var(--line)" }}
        >
          Clear Dates
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2.5">
        <div className="flex-1 rounded-[14px] px-3.5 py-2.5" style={{ minWidth: 150, background: "var(--soft)", border: "1px solid var(--line)" }}>
          <div className="text-[10.5px] font-extrabold tracking-[0.16em]" style={{ color: "var(--mut)" }}>
            {isBlock ? "START DATE" : "CHECK-IN"}
          </div>
          <div className="text-[14px] font-bold">{s.checkIn || "--"}</div>
        </div>
        <div className="flex-1 rounded-[14px] px-3.5 py-2.5" style={{ minWidth: 150, background: "var(--soft)", border: "1px solid var(--line)" }}>
          <div className="text-[10.5px] font-extrabold tracking-[0.16em]" style={{ color: "var(--mut)" }}>
            {isBlock ? "END DATE" : "CHECK-OUT"}
          </div>
          <div className="text-[14px] font-bold">{s.checkOut || "--"}</div>
        </div>
        <div className="flex-1 rounded-[14px] px-3.5 py-2.5" style={{ minWidth: 150, background: "var(--accSoft)", border: "1px solid var(--acc)" }}>
          <div className="text-[10.5px] font-extrabold tracking-[0.16em]" style={{ color: "var(--accInk)" }}>
            NIGHTS
          </div>
          <div className="text-[14px] font-extrabold" style={{ color: "var(--accInk)" }}>
            {nights || "--"}
          </div>
        </div>
      </div>

      {collapsed && (
        <div className="mb-3 rounded-xl px-3.5 py-2.5 text-[12.5px] font-semibold" style={{ background: "var(--soft)", color: "var(--mut)" }}>
          Calendar minimized -- dates above are unaffected. Expand to change them.
        </div>
      )}

      {!collapsed && (
      <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[11.5px] font-extrabold" style={{ color: "var(--mut)" }}>
          QUICK PICK
        </span>
        <button onClick={() => quickPick("tonight")} className="ibw-chip">
          1 Night
        </button>
        <button onClick={() => quickPick("weekend")} className="ibw-chip">
          This weekend
        </button>
        <button onClick={() => quickPick("3n")} className="ibw-chip">
          3 nights
        </button>
        <button
          onClick={() => patch({ checkIn: null, checkOut: null })}
          className="text-[12.5px] font-bold underline"
          style={{ background: "none", border: "none", color: "var(--acc)", cursor: "pointer" }}
        >
          Custom / clear
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3.5 text-[11.5px]" style={{ color: "var(--mut)" }}>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: "var(--acc)" }} />
          Selected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: "var(--accSoft)" }} />
          In range
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--green)" }} />
          Lowest rate
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--amber)" }} />
          High demand
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ border: "1px dashed var(--amber)" }} />
          {isBlock ? "Peak · high demand" : `Peak · min ${avail.minNights} nights`}
        </span>
      </div>

      {avail.peakDates.size > 0 && s.checkIn && s.checkOut && [...avail.peakDates].some((d) => d >= (s.checkIn as string) && d <= (s.checkOut as string)) && (
        <div className="ibw-fade-up mb-3 rounded-2xl px-3.5 py-2.5 text-[12.5px] font-bold" style={{ background: "var(--amberSoft)", border: "1px solid var(--amber)", color: "var(--amber)" }}>
          {isBlock
            ? "⚠ This range includes high-demand peak dates -- you'd be blocking dates that would otherwise carry higher rates."
            : "⚠ This range includes high-demand peak dates — rates are higher and a minimum-nights rule applies."}
        </div>
      )}

      {loading ? (
        <Spinner label="Checking availability…" />
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between">
            <button onClick={() => setCalOffset((v) => v - 1)} className="rounded-[10px] px-3.5 py-1.5 text-[12.5px] font-bold" style={{ border: "1px solid var(--line)" }}>
              ‹ Prev
            </button>
            <button onClick={() => setCalOffset((v) => v + 1)} className="rounded-[10px] px-3.5 py-1.5 text-[12.5px] font-bold" style={{ border: "1px solid var(--line)" }}>
              Next ›
            </button>
          </div>
          <div className="flex flex-wrap gap-5" onMouseUp={finishDrag}>
            {months.map((m) => (
              <MonthGrid
                key={m.toISOString()}
                month={m}
                checkIn={s.checkIn}
                checkOut={s.checkOut}
                isBlocked={isBlocked}
                isPast={isPast}
                isPeak={(d) => avail.peakDates.has(iso(d))}
                rateFor={rateFor}
                loBand={loBand}
                hiBand={hiBand}
                inRange={inRange}
                onDown={selectDay}
                onEnter={dragEnter}
              />
            ))}
          </div>
        </>
      )}
      </>
      )}

      {!s.property && (
        <div className="mt-3 rounded-xl px-3.5 py-2.5 text-[12.5px] font-semibold" style={{ background: "var(--blueSoft)", color: "var(--blue)" }}>
          Rates shown are indicative -- exact per-night pricing locks in once you pick a property, and availability is re-checked then.
        </div>
      )}
      {s.checkIn && s.checkOut && (
        <div className="ibw-fade-up mt-3 rounded-xl px-3.5 py-2.5 text-[12.5px] font-bold" style={{ background: "var(--greenSoft)", color: "var(--green)" }}>
          {isBlock ? "✓ Free to block" : "✓ Dates are available"} -- {s.checkIn} → {s.checkOut} · {nights} night{nights === 1 ? "" : "s"}.
        </div>
      )}
    </div>
  );
}

function expandRange(startStr?: string, endStr?: string): string[] {
  if (!startStr || !endStr) return [];
  const out: string[] = [];
  let d = new Date(startStr);
  const end = new Date(endStr);
  let guard = 0;
  while (d <= end && guard < 400) {
    out.push(iso(d));
    d = addDays(d, 1);
    guard++;
  }
  return out;
}

function MonthGrid({
  month,
  checkIn,
  checkOut,
  isBlocked,
  isPast,
  isPeak,
  rateFor,
  loBand,
  hiBand,
  inRange,
  onDown,
  onEnter,
}: {
  month: Date;
  checkIn: string | null;
  checkOut: string | null;
  isBlocked: (d: Date) => boolean;
  isPast: (d: Date) => boolean;
  isPeak: (d: Date) => boolean;
  rateFor: (d: Date) => number;
  loBand: number;
  hiBand: number;
  inRange: (dIso: string) => boolean;
  onDown: (d: Date) => void;
  onEnter: (d: Date) => void;
}) {
  const year = month.getFullYear();
  const mo = month.getMonth();
  const first = new Date(year, mo, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, mo + 1, 0).getDate();
  const cells: Array<Date | null> = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, mo, i + 1))];

  return (
    <div className="flex-1" style={{ minWidth: 320 }}>
      <div className="mb-2 text-center text-[13.5px] font-extrabold">{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</div>
      <div className="mb-1 grid grid-cols-7 gap-[3px] text-center text-[10px] font-extrabold" style={{ color: "var(--mut)" }}>
        {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <StaggerGroup className="grid select-none grid-cols-7 gap-[5px]" triggerKey={month.toISOString()}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const dIso = iso(d);
          const blocked = isBlocked(d);
          const past = isPast(d);
          const selected = dIso === checkIn || dIso === checkOut;
          const within = inRange(dIso);
          const disabled = blocked || past;
          const peak = !disabled && isPeak(d);
          const rate = rateFor(d);
          const cheap = !disabled && rate <= loBand;
          const pricey = !disabled && rate >= hiBand;
          const tierSuffix = peak ? " · peak, min 2 nights" : cheap ? " · lowest rate" : pricey ? " · high demand" : "";
          return (
            <div
              key={i}
              onMouseDown={() => !disabled && onDown(d)}
              onMouseEnter={() => !disabled && onEnter(d)}
              title={blocked ? "Unavailable" : past ? "Past date" : `${money(rate)}/night${tierSuffix}`}
              className="cursor-pointer rounded-md p-2 text-center text-[13px]"
              style={{
                cursor: disabled ? "not-allowed" : "pointer",
                background: selected ? "var(--acc)" : within ? "var(--accSoft)" : "transparent",
                color: selected ? "var(--accOn)" : disabled ? "var(--line)" : "var(--txt)",
                opacity: past ? 0.35 : 1,
                textDecoration: blocked ? "line-through" : "none",
                border: peak && !selected ? "1px dashed var(--amber)" : "1px solid transparent",
                transform: selected ? "scale(1.04)" : "none",
                boxShadow: selected ? "var(--shadow)" : "none",
                transition: "background .12s ease, transform .12s ease",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700 }}>{d.getDate()}</div>
              <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85, color: selected ? "var(--accOn)" : cheap ? "var(--green)" : pricey ? "var(--amber)" : "var(--mut)" }}>
                {!disabled ? `${Math.round(rate / 1000)}k` : ""}
              </div>
            </div>
          );
        })}
      </StaggerGroup>
    </div>
  );
}
