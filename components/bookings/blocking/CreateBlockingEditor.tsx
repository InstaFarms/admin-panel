"use client";

import { createReservationPropertyBlock, getBlockingReasonsForProperty, getPropertyAvailability } from "@/actions/bookingActions";
import { fetchPropertyFullData } from "@/actions/propertyActions";
import { getPropertyResortRooms, type ResortRoom } from "@/actions/resortRoomActions";
import PropertySelector from "@/components/PropertySelector";
import { normalizePropertyFullData } from "@/lib/properties/fullPropertyData";
import { parseServerActionResult } from "@/utils/utils";
import { useRouter } from "next/navigation";
import { CSSProperties, useEffect, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";

interface CreateBlockingEditorProps {
  brands: Array<{ id: string; name: string }>;
}

type BlockingReasonOption = {
  id: string;
  reason: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const toDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const fmtRange = (start: Date | null, end: Date | null) => {
  if (!start) return "";
  const s = start;
  const e = end ?? start;
  if (toDateKey(s) === toDateKey(e)) {
    return s.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) {
    return `${s.getDate()} – ${e.getDate()} ${e.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`;
  }
  return `${s.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${e.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
};

const isBeforeToday = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d < today;
};

type CommercialPricing = Record<string, unknown>;
type SpecialDatePricing = { date?: string; price?: number | string | null; priceWithGST?: number | string | null };

const WEEKDAY_KEYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"] as const;

const asNumber = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") { const n = Number(v); return Number.isFinite(n) ? n : null; }
  return null;
};

const asRecord = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

const resolveBrandSlug = (brandName: string): "instafarms" | "mago" => {
  const n = brandName.trim().toLowerCase();
  if (n.includes("mago")) return "mago";
  return "instafarms";
};

const resolveCommercialPricing = (payload: Record<string, unknown>, brandName: string): CommercialPricing | null => {
  const normalized = normalizePropertyFullData(payload);
  const slug = resolveBrandSlug(brandName);
  return asRecord(normalized.tabs.brandData[slug]?.commercial) ?? asRecord(normalized.tabs.commercial);
};

const getDatePrice = (date: Date, pricing: CommercialPricing | null, specialMap: Map<string, number>): number | null => {
  const key = toDateKey(date);
  const special = specialMap.get(key);
  if (special !== undefined) return special;
  if (!pricing) return null;
  const wk = WEEKDAY_KEYS[date.getDay()];
  return asNumber(pricing[`${wk}PriceWithGST`]) ?? asNumber(pricing[`${wk}Price`]);
};

const fmtPrice = (price: number | null): string | null => {
  if (!price || price <= 0) return null;
  if (price >= 1000) return `₹${Math.round(price / 1000)}K`;
  return `₹${Math.round(price)}`;
};

function getMonthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ blank: true; key: string } | { blank: false; key: string; date: Date; day: number }> = [];
  for (let i = 0; i < startDow; i++) cells.push({ blank: true, key: `b${i}` });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ blank: false, key: `d${d}`, date: new Date(year, month, d), day: d });
  }
  while (cells.length % 7 !== 0) cells.push({ blank: true, key: `e${cells.length}` });
  return cells;
}

export default function CreateBlockingEditor({ brands }: CreateBlockingEditorProps) {
  const router = useRouter();
  const [loading, startTransition] = useTransition();

  const [brandId, setBrandId] = useState("");
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [blockingType, setBlockingType] = useState("PERMANENT");
  const [blockingReasonId, setBlockingReasonId] = useState("");
  const [blockingReasonNotes, setBlockingReasonNotes] = useState("");
  const [manualBlockReason, setManualBlockReason] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [blockingReasons, setBlockingReasons] = useState<BlockingReasonOption[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [commercialPricing, setCommercialPricing] = useState<CommercialPricing | null>(null);
  const [resortRooms, setResortRooms] = useState<ResortRoom[] | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [blockAllRooms, setBlockAllRooms] = useState<boolean>(false);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const unavailableDateKeys = useMemo(
    () => new Set(unavailableDates.map((d) => toDateKey(d))),
    [unavailableDates]
  );

  const selectedNightCount =
    startDate && endDate
      ? Math.max(0, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

  const brandName = brands.find((b) => b.id === brandId)?.name ?? "";

  const specialDatePriceMap = useMemo(() => {
    const specialDates = Array.isArray(commercialPricing?.specialDates)
      ? (commercialPricing!.specialDates as SpecialDatePricing[])
      : [];
    return specialDates.reduce((acc, sd) => {
      if (!sd?.date) return acc;
      const price = asNumber(sd.priceWithGST) ?? asNumber(sd.price);
      if (price !== null) acc.set(sd.date, price);
      return acc;
    }, new Map<string, number>());
  }, [commercialPricing]);

  useEffect(() => {
    setPropertyId(null);
    setStartDate(null);
    setEndDate(null);
    setUnavailableDates([]);
    setBlockingReasons([]);
    setBlockingReasonId("");
    setManualBlockReason("");
    setShowNotes(false);
    setBlockingReasonNotes("");
    setCommercialPricing(null);
    setResortRooms(null);
    setSelectedRoomId("");
  }, [brandId]);

  useEffect(() => {
    const run = async () => {
      if (!propertyId || !brandId || !brandName) { setCommercialPricing(null); return; }
      try {
        const result = await fetchPropertyFullData(propertyId, { includeGallery: false, brandId });
        if (result.error || !result.data) { setCommercialPricing(null); return; }
        setCommercialPricing(resolveCommercialPricing(result.data, brandName));
      } catch { setCommercialPricing(null); }
    };
    run();
  }, [propertyId, brandId, brandName]);

  // Check if selected property is a Resort and load its rooms
  useEffect(() => {
    setResortRooms(null);
    setSelectedRoomId("");
    if (!propertyId) return;
    if (!brandId) return;
    getPropertyResortRooms(propertyId, brandId).then(({ rooms }) => {
      // rooms === null  → not a resort (or API error) — keep null
      // rooms === []    → resort with no active rooms
      // rooms.length>0 → resort with rooms
      setResortRooms(rooms);
      setSelectedRoomId("");
    });
  }, [propertyId, brandId]);

  useEffect(() => {
    const run = async () => {
      if (!propertyId || !brandId) { setUnavailableDates([]); return; }
      setIsLoadingAvailability(true);
      try {
        const result = await getPropertyAvailability(propertyId, brandId);
        if (result.error || !result.success) { setUnavailableDates([]); return; }
        const map = new Map<string, Date>();
        const add = (date: Date) => { const k = toDateKey(date); if (!map.has(k)) map.set(k, new Date(`${k}T00:00:00`)); };
        result.success.blockedDates.forEach((d: string) => add(new Date(`${d}T00:00:00`)));
        result.success.bookedRanges.forEach((r: { checkinDate: string; checkoutDate: string }) => {
          const start = new Date(`${r.checkinDate}T00:00:00`);
          const end = new Date(`${r.checkoutDate}T00:00:00`);
          for (const d = new Date(start); d < end; d.setDate(d.getDate() + 1)) add(new Date(d));
        });
        setUnavailableDates(Array.from(map.values()));
      } catch { setUnavailableDates([]); }
      finally { setIsLoadingAvailability(false); }
    };
    run();
  }, [propertyId, brandId]);

  useEffect(() => {
    const run = async () => {
      if (!propertyId || !brandId) { setBlockingReasons([]); setBlockingReasonId(""); return; }
      const result = await getBlockingReasonsForProperty(propertyId, brandId);
      if (result.error || !result.success) { setBlockingReasons([]); setBlockingReasonId(""); return; }
      const reasons: BlockingReasonOption[] = Array.isArray(result.success)
        ? result.success.map((item: any) => ({ id: String(item.id), reason: String(item.reason) }))
        : [];
      setBlockingReasons(reasons);
      setBlockingReasonId((current) => reasons.some((item) => item.id === current) ? current : "");
    };
    run();
  }, [propertyId, brandId]);

  const handleDayClick = (date: Date) => {
    if (!propertyId || isBeforeToday(date) || unavailableDateKeys.has(toDateKey(date))) return;
    if (!startDate || endDate) { setStartDate(date); setEndDate(null); return; }
    if (date <= startDate) { setStartDate(date); setEndDate(null); return; }
    setEndDate(date);
  };

  const navMonth = (delta: number) => {
    const next = new Date(calYear, calMonth + delta, 1);
    setCalYear(next.getFullYear());
    setCalMonth(next.getMonth());
  };

  const handleSubmit = () => {
    if (!brandId) { toast.error("Please select a brand"); return; }
    if (!propertyId) { toast.error("Please select a property"); return; }
    if (!startDate || !endDate) { toast.error("Please select start and end dates"); return; }
    if (!(startDate < endDate)) { toast.error("End date must be after start date"); return; }
    // For resort properties, a room must be selected OR blockAllRooms must be checked
    if (resortRooms !== null && !selectedRoomId && !blockAllRooms) {
      toast.error("Please select a room or check 'Block all rooms' for this Resort property");
      return;
    }
    const blockReason =
      manualBlockReason.trim() ||
      blockingReasons.find((item) => item.id === blockingReasonId)?.reason ||
      "";
    startTransition(() => {
      const roomIdsToBlock = blockAllRooms && resortRooms ? resortRooms.filter(r => r.isActive).map(r => r.id) : [selectedRoomId];

      const promises = roomIdsToBlock.map((rId) => {
        const formData = new FormData();
        formData.set("brandId", brandId);
        formData.set("propertyId", propertyId);
        formData.set("startDate", toDateKey(startDate));
        formData.set("endDate", toDateKey(endDate));
        formData.set("blockingType", blockingType);
        formData.set("reason", blockReason);
        formData.set("notes", blockingReasonNotes.trim());
        if (rId) formData.set("roomId", rId);
        return parseServerActionResult(createReservationPropertyBlock(formData));
      });

      toast.promise(Promise.all(promises), {
        loading: "Creating blocking...",
        success: (results) => {
          // Find first error if any, otherwise success
          const errorResult = results.find(r => r.error);
          if (errorResult) throw new Error(errorResult.error);
          router.push("/admin/bookings/blocking");
          return "Blocking created successfully";
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  const hasProperty = !!propertyId;
  const hasSelection = !!startDate;
  const showOptions = hasProperty && hasSelection;
  const isResort = resortRooms !== null;
  const resortRoomOk = !isResort || !!selectedRoomId || blockAllRooms;
  const canCreate = showOptions && !!blockingType && !!(manualBlockReason.trim() || blockingReasonId) && resortRoomOk;

  const cells = getMonthCells(calYear, calMonth);

  return (
    <div style={{ fontFamily: "inherit", color: "#eef2f7" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes cb-panel-in { from { opacity:0; transform:translateY(14px) scale(.985); } to { opacity:1; transform:none; } }
        @keyframes cb-fade-up   { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes cb-floaty    { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-5px); } }
        @keyframes cb-badge-pop { 0% { transform:scale(.7); } 60% { transform:scale(1.12); } 100% { transform:scale(1); } }
        @keyframes cb-month-in  { from { opacity:0; transform:translateX(10px); } to { opacity:1; transform:none; } }
        .cb-nav-prev:hover { background:#172741 !important; border-color:#3a4d6b !important; color:#fff !important; transform:translateX(-2px); }
        .cb-nav-next:hover { background:#172741 !important; border-color:#3a4d6b !important; color:#fff !important; transform:translateX(2px); }
        .cb-cell-avail:hover { border-color:#5a8bff !important; background:#142036 !important; transform:translateY(-2px); box-shadow:0 9px 22px -10px rgba(47,111,237,.55); }
.cb-notes-btn:hover { background:rgba(47,111,237,.06) !important; border-color:#3a4d6b !important; color:#aab4c1 !important; }
        .cb-create-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 14px 30px -10px rgba(47,111,237,.9) !important; filter:brightness(1.06); }
      ` }} />
      {/* Brand + Property */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 760, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>Brand <span style={{ color: "#e0698a" }}>*</span></label>
          <select value={brandId} onChange={(e) => setBrandId(e.target.value)} style={selectStyle}>
            <option value="">Select brand</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Property <span style={{ color: "#e0698a" }}>*</span></label>
          <PropertySelector
            propertyId={propertyId}
            update={setPropertyId}
            readOnly={!brandId}
            brandId={brandId}
          />
        </div>
      </div>

      {/* Resort Room Selector — shown only when property is a Resort */}
      {resortRooms !== null && (
        <div style={{ maxWidth: 760, marginBottom: 24 }}>
          <label style={labelStyle}>
            Room <span style={{ color: "#e0698a" }}>*</span>{" "}
            <span style={{ fontSize: 11, color: "#5a8bff", fontWeight: 400 }}>(Resort property — select a room to block)</span>
          </label>
          {resortRooms.length === 0 ? (
            <div style={{ fontSize: 13, color: "#e0698a", padding: "10px 14px", background: "#1a1220", border: "1px solid #3a2030", borderRadius: 10 }}>
              No active rooms found for this resort. Add rooms in the property editor first.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <select
                value={selectedRoomId}
                onChange={(e) => {
                  setSelectedRoomId(e.target.value);
                  if (e.target.value) setBlockAllRooms(false);
                }}
                style={selectStyle}
                disabled={blockAllRooms}
              >
                <option value="">— Select a room —</option>
                {resortRooms.filter((r) => r.isActive).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.roomNumber} — {r.roomName} ({r.roomType}, max {r.maxGuestCount} guests)
                  </option>
                ))}
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#cfd8e2" }}>
                <input
                  type="checkbox"
                  checked={blockAllRooms}
                  onChange={(e) => {
                    setBlockAllRooms(e.target.checked);
                    if (e.target.checked) setSelectedRoomId("");
                  }}
                  style={{ cursor: "pointer" }}
                />
                Block all rooms
              </label>
            </div>
          )}
        </div>
      )}

      {/* Calendar + Side Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>
        {/* Calendar */}
        <div style={{
          background: "#0a111c",
          border: "1px solid #1d2735",
          borderRadius: 16,
          padding: "20px 20px 24px",
          opacity: propertyId ? 1 : 0.5,
          pointerEvents: propertyId ? "auto" : "none",
          transition: "opacity .2s",
        }}>
          {/* Calendar header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button type="button" className="cb-nav-prev" onClick={() => navMonth(-1)} style={navBtnStyle}>‹</button>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", minWidth: 170 }}>{MONTHS[calMonth]} {calYear}</div>
              <button type="button" className="cb-nav-next" onClick={() => navMonth(1)} style={navBtnStyle}>›</button>
            </div>
            <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#94a0af" }}>
              {[
                { bg: "#101826", border: "1px solid #2f3d50", label: "Available" },
                { bg: "#3a2030", border: "1px solid #5a2a3e", label: "Unavailable" },
                { bg: "#2f6fed", border: "none", label: "Selected" },
              ].map(({ bg, border, label }) => (
                <span key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: bg, border, display: "inline-block" }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Weekday labels */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 6 }}>
            {WEEKDAYS.map((wd) => (
              <div key={wd} style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "#6f7c8c", paddingBottom: 4 }}>{wd}</div>
            ))}
          </div>

          {/* Day cells */}
          <div key={`${calYear}-${calMonth}`} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, animation: "cb-month-in .22s ease both" }}>
            {cells.map((cell) => {
              if (cell.blank) return <div key={cell.key} />;
              const { date, day } = cell;
              const key = toDateKey(date);
              const past = isBeforeToday(date);
              const unavailable = unavailableDateKeys.has(key);
              const startKey = startDate ? toDateKey(startDate) : null;
              const endKey = endDate ? toDateKey(endDate) : null;
              const isStart = key === startKey;
              const isEnd = key === endKey;
              const inRange = !!(startDate && endDate && date > startDate && date < endDate);
              const selected = isStart || isEnd;
              const disabled = past || unavailable;
              const price = fmtPrice(getDatePrice(date, commercialPricing, specialDatePriceMap));

              let bg = "#101826";
              let border = "1px solid #1f2a3a";
              let color = "#e7edf4";
              let priceColor = "#7d8a99";
              let opacity = 1;
              let textDecoration = "none" as CSSProperties["textDecoration"];

              if (past) { bg = "#0c131e"; border = "1px solid #161e2b"; color = "#5a6675"; priceColor = "#5a6675"; opacity = 0.4; }
              else if (unavailable) { bg = "#15101a"; border = "1px solid #3a2030"; color = "#8a93a0"; priceColor = "#e0698a"; textDecoration = "line-through"; }
              else if (selected) { bg = "linear-gradient(180deg,#3f7bff,#2f6fed)"; border = "1px solid #5a8bff"; color = "#fff"; priceColor = "rgba(255,255,255,.8)"; }
              else if (inRange) { bg = "rgba(47,111,237,.16)"; border = "1px solid rgba(90,139,255,.35)"; color = "#dbe6ff"; priceColor = "#9fb6e8"; }

              return (
                <button
                  key={cell.key}
                  type="button"
                  className={!disabled && !selected && !inRange ? "cb-cell-avail" : undefined}
                  onClick={() => handleDayClick(date)}
                  disabled={disabled}
                  style={{
                    minHeight: 68,
                    padding: "9px 10px",
                    borderRadius: 10,
                    background: bg,
                    border,
                    color,
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity,
                    textDecoration,
                    transition: "all .12s",
                    fontFamily: "inherit",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{day}</span>
                  {price && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: priceColor }}>{price}</span>
                  )}
                </button>
              );
            })}
          </div>

          {isLoadingAvailability && (
            <div style={{ textAlign: "center", fontSize: 12, color: "#94a0af", marginTop: 14 }}>
              Checking availability…
            </div>
          )}
        </div>

        {/* Side Panel */}
        <aside style={{ position: "sticky", top: 20 }}>
          {!hasProperty && (
            <div key="empty-brand" style={{ ...emptyCardStyle, animation: "cb-panel-in .4s cubic-bezier(.2,.8,.2,1) both" }}>
              <div style={{ ...emptyIconStyle, animation: "cb-floaty 3.4s ease-in-out infinite" }}>🏷️</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Select a property</div>
              <div style={{ fontSize: 13, color: "#94a0af", marginTop: 8, lineHeight: 1.5 }}>
                Choose a brand and property above to load its availability calendar.
              </div>
            </div>
          )}

          {hasProperty && !hasSelection && (
            <div key="empty-date" style={{ ...emptyCardStyle, animation: "cb-panel-in .4s cubic-bezier(.2,.8,.2,1) both" }}>
              <div style={{ ...emptyIconStyle, animation: "cb-floaty 3.4s ease-in-out infinite" }}>📅</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Pick dates to block</div>
              <div style={{ fontSize: 13, color: "#94a0af", marginTop: 8, lineHeight: 1.5 }}>
                Tap a start date on the calendar, then tap an end date to create a range.
              </div>
            </div>
          )}

          {showOptions && (
            <div key="options" style={{ background: "#0e1521", border: "1px solid #1d2735", borderRadius: 16, padding: 20, animation: "cb-panel-in .42s cubic-bezier(.2,.8,.2,1) both" }}>
              {/* Date summary */}
              <div style={{ background: "#101826", border: "1px solid #243044", borderRadius: 12, padding: "14px 16px", marginBottom: 20, animation: "cb-fade-up .4s .0s both" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#36c0aa", marginBottom: 6 }}>
                  Selected dates
                </div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{fmtRange(startDate, endDate)}</div>
                  {endDate && selectedNightCount > 0 && (
                    <div key={selectedNightCount} style={{ fontSize: 12, fontWeight: 600, color: "#9fb6e8", background: "rgba(47,111,237,.16)", border: "1px solid rgba(90,139,255,.3)", padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap", animation: "cb-badge-pop .35s cubic-bezier(.2,.9,.3,1.3) both" }}>
                      {selectedNightCount} night{selectedNightCount === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setStartDate(null); setEndDate(null); }}
                  style={{ marginTop: 8, fontSize: 11.5, color: "#7d8a99", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                >
                  Clear selection
                </button>
              </div>

              {/* Blocking Type */}
              <div style={{ marginBottom: 18, animation: "cb-fade-up .4s .07s both" }}>
                <label style={fieldLabelStyle}>Blocking type <span style={{ color: "#e0698a" }}>*</span></label>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["PERMANENT", "TEMPORARY"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setBlockingType(type)}
                      style={{
                        flex: 1, padding: "10px 4px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                        fontFamily: "inherit", cursor: "pointer", textAlign: "center", transition: "all .12s",
                        ...(blockingType === type
                          ? { background: "linear-gradient(180deg,#3f7bff,#2f6fed)", color: "#fff", border: "1px solid #5a8bff", boxShadow: "0 4px 14px -6px rgba(47,111,237,.8)" }
                          : { background: "#101826", color: "#aab4c1", border: "1px solid #243044" }
                        ),
                      }}
                    >
                      {type.charAt(0) + type.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Blocking Reason */}
              <div style={{ marginBottom: 18, animation: "cb-fade-up .4s .14s both" }}>
                <label style={fieldLabelStyle}>Blocking reason <span style={{ color: "#e0698a" }}>*</span></label>
                <input
                  value={manualBlockReason}
                  onChange={(e) => setManualBlockReason(e.target.value)}
                  maxLength={500}
                  placeholder="Maintenance, renovation, owner hold..."
                  style={{ ...selectStyle, paddingRight: 14, backgroundImage: "none" }}
                />
                <select
                  value={blockingReasonId}
                  onChange={(e) => setBlockingReasonId(e.target.value)}
                  disabled={blockingReasons.length === 0}
                  style={{ display: "none" }}
                >
                  <option value="">{blockingReasons.length === 0 ? "Loading reasons…" : "Select a reason"}</option>
                  {blockingReasons.map((r) => <option key={r.id} value={r.id}>{r.reason}</option>)}
                </select>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 20, animation: "cb-fade-up .4s .28s both" }}>
                {!showNotes ? (
                  <button
                    type="button"
                    className="cb-notes-btn"
                    onClick={() => setShowNotes(true)}
                    style={{ width: "100%", background: "transparent", border: "1px dashed #2a3648", borderRadius: 10, padding: 11, color: "#7d8a99", fontSize: 12.5, fontFamily: "inherit", cursor: "pointer", transition: "background .15s, border-color .15s, color .15s" }}
                  >
                    + Add reason notes <span style={{ opacity: 0.7 }}>(optional)</span>
                  </button>
                ) : (
                  <div>
                    <label style={{ ...fieldLabelStyle, fontWeight: 500, color: "#8a96a6" }}>
                      Reason notes <span style={{ opacity: 0.7 }}>(optional)</span>
                    </label>
                    <textarea
                      value={blockingReasonNotes}
                      onChange={(e) => setBlockingReasonNotes(e.target.value)}
                      maxLength={1000}
                      placeholder="Add context for operations…"
                      autoFocus
                      style={{ width: "100%", minHeight: 80, resize: "vertical", background: "#0c131e", border: "1px solid #243044", borderRadius: 10, padding: "11px 13px", color: "#e7edf4", fontSize: 13, fontFamily: "inherit", outline: "none", lineHeight: 1.5 }}
                    />
                    <div style={{ fontSize: 11, color: "#5f6c7c", marginTop: 4 }}>{blockingReasonNotes.length}/1000</div>
                  </div>
                )}
              </div>

              {/* Create */}
              <button
                type="button"
                className="cb-create-btn"
                onClick={handleSubmit}
                disabled={!canCreate || loading}
                style={{
                  width: "100%", padding: 14, borderRadius: 11, fontSize: 15, fontWeight: 700,
                  fontFamily: "inherit", border: "none", transition: "all .15s",
                  cursor: canCreate && !loading ? "pointer" : "not-allowed",
                  animation: "cb-fade-up .4s .35s both",
                  ...(canCreate && !loading
                    ? { background: "linear-gradient(180deg,#3f7bff,#2563eb)", color: "#fff", boxShadow: "0 8px 22px -8px rgba(47,111,237,.8)" }
                    : { background: "#1a2433", color: "#5e6b7b" }
                  ),
                }}
              >
                {loading ? "Creating…" : "Create blocking"}
              </button>
              {!canCreate && (
                <div style={{ fontSize: 11.5, color: "#7d8a99", textAlign: "center", marginTop: 8 }}>
                  Choose a type and reason to continue.
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

const navBtnStyle: CSSProperties = {
  width: 34, height: 34, borderRadius: "50%", background: "#101826", border: "1px solid #243044",
  color: "#cfd8e2", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
};
const labelStyle: CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: "#cfd8e2", marginBottom: 8 };
const fieldLabelStyle: CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: "#cfd8e2", marginBottom: 9 };
const emptyCardStyle: CSSProperties = { background: "#0e1521", border: "1px solid #1d2735", borderRadius: 16, padding: "36px 24px", textAlign: "center" };
const emptyIconStyle: CSSProperties = { width: 52, height: 52, borderRadius: 14, background: "#101826", border: "1px solid #243044", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24 };
const CHEVRON = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' stroke='%23808d9c' stroke-width='2' viewBox='0 0 24 24'><path d='M6 9l6 6 6-6'/></svg>")`;
const selectStyle: CSSProperties = {
  width: "100%", borderRadius: 10, padding: "12px 38px 12px 14px", fontSize: 14,
  fontFamily: "inherit", outline: "none", appearance: "none",
  background: "#101826", border: "1px solid #243044", color: "#e7edf4", cursor: "pointer",
  backgroundImage: CHEVRON, backgroundRepeat: "no-repeat", backgroundPosition: "right 13px center",
};
