"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ToggleSwitch, TextInput, Textarea, Button, Badge } from "flowbite-react";
import { updateElivaasPropertySetting } from "@/actions/elivaasActions";
import type { ElivaasPropertySettings } from "@/actions/elivaasActions";

interface CatalogData {
  description:   string | null;
  maxOccupancy:  number | null;
  lat:           string | null;
  lng:           string | null;
  firstImageUrl: string | null;
  imageCount:     number | null;
  amenityCount:   number | null;
  faqsJson?:      string | null;
  imagesJson?:    string | null;
  amenitiesJson?: string | null;
  houseRulesJson?:string | null;
  metricsJson?:   string | null;
  extraAdultRate?:number | null;
  extraChildRate?:number | null;
  securityFee?:   number | null;
}

interface Props {
  propertyId: string;
  propertyName: string;
  catalogData: CatalogData;
  initialSettings: Omit<ElivaasPropertySettings, "propertyId" | "createdAt" | "updatedAt">;
  checkinDate?: string;
  checkoutDate?: string;
  adults?: number;
  children?: number;
}

function Section({
  title,
  badge,
  children,
  defaultOpen = false,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-100 rounded-lg dark:border-gray-700">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        <span className="flex items-center gap-2">
          {title}
          {badge && (
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 normal-case tracking-normal">
              {badge}
            </span>
          )}
        </span>
        <span className="text-gray-300">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="px-3 pb-3 pt-2 space-y-3">{children}</div>}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
        {label}
        {hint && <span className="ml-1 font-normal text-gray-400">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function UnsavedModal({
  onLeave, onStay, onSaveAndLeave, saving,
}: {
  onLeave: () => void;
  onStay: () => void;
  onSaveAndLeave: () => void;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Unsaved changes</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          You have unsaved changes. What would you like to do?
        </p>
        <div className="flex gap-2 justify-end flex-wrap">
          <button
            onClick={onStay}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Stay
          </button>
          <button
            onClick={onLeave}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
          >
            Leave anyway
          </button>
          <button
            onClick={onSaveAndLeave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save & Leave"}
          </button>
        </div>
      </div>
    </div>
  );
}

const HIDE_REASON_OPTIONS = [
  { value: "maintenance", label: "Maintenance / Not ready" },
  { value: "pricing",     label: "Pricing issue" },
  { value: "temporary",  label: "Testing / Temporary" },
  { value: "other",      label: "Other" },
] as const;

function HideReasonModal({
  onConfirm,
  onCancel,
  saving,
}: {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [selected, setSelected] = useState<string>("");
  const [note, setNote] = useState("");

  const finalReason = selected === "other"
    ? (note.trim() || "Other")
    : selected
      ? `${HIDE_REASON_OPTIONS.find(o => o.value === selected)?.label}${note.trim() ? ` — ${note.trim()}` : ""}`
      : "";

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Hide property</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Why are you hiding this property?</p>
        <div className="flex flex-col gap-2 mb-3">
          {HIDE_REASON_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name="hideReason"
                value={opt.value}
                checked={selected === opt.value}
                onChange={() => setSelected(opt.value)}
                className="accent-emerald-600"
              />
              {opt.label}
            </label>
          ))}
        </div>
        {selected && (
          <input
            type="text"
            placeholder={selected === "other" ? "Describe the reason…" : "Additional notes (optional)"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 mb-4"
            autoFocus
          />
        )}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={() => finalReason && onConfirm(finalReason)}
            disabled={!selected || (selected === "other" && !note.trim()) || saving}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Hide property"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LeaveCountdownToast({ seconds, onUndo, onDismiss }: { seconds: number; onUndo: () => void; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-2xl">
      <span>Leaving in <span className="font-bold tabular-nums">{seconds}s</span>…</span>
      <button
        onClick={onUndo}
        className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 font-semibold text-xs"
      >
        Undo
      </button>
      <button
        onClick={onDismiss}
        className="text-gray-400 hover:text-white ml-1"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

function ElivaasHint({ value, autoFilled, onImport }: { label?: string; value: string | null; autoFilled?: boolean; onImport?: () => void }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 rounded bg-blue-50 border border-blue-100 px-2 py-1 text-[11px] text-blue-600 mt-1">
      <span className="flex-1 min-w-0">
        <span className="font-medium text-blue-400">Elivaas: </span>{value}
      </span>
      {autoFilled && !onImport && (
        <span className="shrink-0 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1 py-0.5">
          auto-filled
        </span>
      )}
      {onImport && (
        <button
          type="button"
          onClick={onImport}
          className="shrink-0 text-[10px] font-semibold text-blue-700 hover:text-blue-900 underline underline-offset-2"
        >
          Import
        </button>
      )}
    </div>
  );
}

export default function ElivaasPropertySettingsRow({
  propertyId,
  propertyName,
  catalogData: cat,
  initialSettings: init,
  checkinDate = "",
  checkoutDate = "",
  adults = 2,
  children = 0,
}: Props) {
  // Visibility & pricing
  const [isVisible, setIsVisible] = useState(init.isVisible);
  const [markup,    setMarkup]    = useState(String(init.markupPercentage));
  const [notes,     setNotes]     = useState(init.adminNotes ?? "");

  // Display
  const [nameOverride, setNameOverride] = useState(init.displayNameOverride ?? "");
  const [description,  setDescription]  = useState(init.descriptionOverride || cat.description || "");

  // Capacity & timing
  const [maxGuests, setMaxGuests] = useState(() => {
    if (init.maxGuestsOverride != null) return String(init.maxGuestsOverride);
    if (cat.maxOccupancy       != null) return String(cat.maxOccupancy);
    return "";
  });
  const [bedrooms,  setBedrooms]  = useState(() => {
    if (init.bedroomCountOverride  != null) return String(init.bedroomCountOverride);
    if (cat.metricsJson) { try { const m = JSON.parse(cat.metricsJson); if (m.bedrooms  != null) return String(m.bedrooms);  } catch {} }
    return "";
  });
  const [bathrooms, setBathrooms] = useState(() => {
    if (init.bathroomCountOverride != null) return String(init.bathroomCountOverride);
    if (cat.metricsJson) { try { const m = JSON.parse(cat.metricsJson); if (m.bathrooms != null) return String(m.bathrooms); } catch {} }
    return "";
  });
  const [beds, setBeds] = useState(() => {
    if ((init as any).bedsCountOverride != null) return String((init as any).bedsCountOverride);
    if (cat.metricsJson) { try { const m = JSON.parse(cat.metricsJson); if (m.beds != null) return String(m.beds); } catch {} }
    return "";
  });
  const [checkIn,  setCheckIn]  = useState(init.checkInTimeOverride  ?? "");
  const [checkOut, setCheckOut] = useState(init.checkOutTimeOverride ?? "");

  // Content — override if set, else fall back to synced JSON
  const [images, setImages] = useState(() => {
    if (init.imagesOverride) return init.imagesOverride;
    if (cat.imagesJson) { try { return (JSON.parse(cat.imagesJson) as any[]).map((i: any) => i.url || i.thumbnailUrl).filter(Boolean).join("\n"); } catch {} }
    return "";
  });
  const [amenities, setAmenities] = useState(() => {
    if (init.amenitiesOverride) return init.amenitiesOverride;
    if (cat.amenitiesJson) { try { return (JSON.parse(cat.amenitiesJson) as any[]).map((a: any) => a.name).filter(Boolean).join(", "); } catch {} }
    return "";
  });
  const [tags,       setTags]       = useState(init.tagsOverride ?? "");
  const [houseRules, setHouseRules] = useState(() => {
    if (init.houseRulesOverride) return init.houseRulesOverride;
    if (cat.houseRulesJson) { try { return (JSON.parse(cat.houseRulesJson) as string[]).filter(Boolean).join("\n"); } catch {} }
    return "";
  });

  // Pricing extras
  const [securityDeposit, setSecurityDeposit] = useState(() => {
    if ((init as any).securityDepositOverride != null) return String((init as any).securityDepositOverride);
    if (cat.securityFee   != null) return String(cat.securityFee);
    return "";
  });
  const [extraAdult, setExtraAdult] = useState(() => {
    if ((init as any).extraAdultRateOverride != null) return String((init as any).extraAdultRateOverride);
    if (cat.extraAdultRate != null) return String(cat.extraAdultRate);
    return "";
  });
  const [extraChild, setExtraChild] = useState(() => {
    if ((init as any).extraChildRateOverride != null) return String((init as any).extraChildRateOverride);
    if (cat.extraChildRate != null) return String(cat.extraChildRate);
    return "";
  });

  // FAQs — loaded from override if set, else from synced faqsJson
  const [faqs, setFaqs] = useState<{ q: string; a: string }[]>(() => {
    const src = (init as any).faqsOverride || cat.faqsJson;
    if (!src) return [];
    try { const p = JSON.parse(src); return Array.isArray(p) ? p.map((f: any) => ({ q: f.q ?? f.question ?? "", a: f.a ?? f.answer ?? "" })) : []; }
    catch { return []; }
  });

  // Spaces/rooms — structured [{title, description}]
  const [spaces, setSpaces] = useState<{ title: string; description: string }[]>(() => {
    const src = (init as any).spacesOverride || (cat as any).spacesJson;
    if (!src) return [];
    try { const p = JSON.parse(src); return Array.isArray(p) ? p.map((s: any) => ({ title: s.title ?? "", description: s.description ?? "" })) : []; }
    catch { return []; }
  });

  // Content sections — structured [{title, content, slug}]
  const [sections, setSections] = useState<{ title: string; content: string; slug: string }[]>(() => {
    const src = (init as any).sectionsOverride || (cat as any).sectionsJson;
    if (!src) return [];
    try { const p = JSON.parse(src); return Array.isArray(p) ? p.map((s: any) => ({ title: s.title ?? "", content: s.content ?? s.description ?? "", slug: s.slug ?? "" })) : []; }
    catch { return []; }
  });

  // Indicative price override
  const [priceOverride, setPriceOverride] = useState(() => {
    if ((init as any).priceAmountOverride != null) return String((init as any).priceAmountOverride);
    return "";
  });

  // Location
  const [area, setArea] = useState(init.areaOverride ?? "");
  const [lat,  setLat]  = useState(init.latOverride  || cat.lat  || "");
  const [lng,  setLng]  = useState(init.lngOverride  || cat.lng  || "");

  const [saving, startSave] = useTransition();
  const [saved,  setSaved]  = useState(false);
  const [saveErr,setSaveErr]= useState("");
  const [showHideModal, setShowHideModal] = useState(false);

  // Unsaved changes tracking
  const isDirty = useRef(false);
  const isMounted = useRef(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingNavHref = useRef<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    isDirty.current = true;
  }, [nameOverride, description, maxGuests, bedrooms, bathrooms,
      checkIn, checkOut, images, amenities, tags, houseRules, area, lat, lng, markup]);

  // Intercept link clicks when dirty
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!isDirty.current) return;
      const anchor = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript")) return;
      e.preventDefault();
      e.stopPropagation();
      pendingNavHref.current = href;
      setShowUnsavedModal(true);
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  // When countdown hits 0, navigate — done in an effect to avoid setState-during-render
  useEffect(() => {
    if (countdown !== 0) return;
    const href = pendingNavHref.current;
    pendingNavHref.current = null;
    setCountdown(null);
    if (href) router.push(href);
  }, [countdown, router]);

  const startCountdown = useCallback((href: string) => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    pendingNavHref.current = href;
    setCountdown(5);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          return 0; // effect handles navigation
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleLeave = useCallback(() => {
    isDirty.current = false;
    setShowUnsavedModal(false);
    const href = pendingNavHref.current;
    pendingNavHref.current = null;
    if (href) router.push(href);
  }, [router]);

  const handleStay = useCallback(() => {
    setShowUnsavedModal(false);
    pendingNavHref.current = null;
  }, []);

  const handleSaveAndLeave = useCallback(() => {
    const href = pendingNavHref.current;
    if (!href) return;
    setShowUnsavedModal(false);
    isDirty.current = false;
    startSave(async () => {
      await updateElivaasPropertySetting(propertyId, {
        markupPercentage:     parseInt(markup) || 20,
        displayNameOverride:  nameOverride.trim() || null,
        adminNotes:           notes.trim() || null,
        descriptionOverride:  description.trim() || null,
        imagesOverride:       images.trim() || null,
        maxGuestsOverride:    parseInt(maxGuests) || null,
        bedroomCountOverride: parseInt(bedrooms) || null,
        bathroomCountOverride:parseInt(bathrooms) || null,
        checkInTimeOverride:  checkIn.trim() || null,
        checkOutTimeOverride: checkOut.trim() || null,
        amenitiesOverride:    amenities.trim() || null,
        tagsOverride:         tags.trim() || null,
        houseRulesOverride:   houseRules.trim() || null,
        areaOverride:         area.trim() || null,
        latOverride:          lat.trim() || null,
        lngOverride:          lng.trim() || null,
      });
      startCountdown(href);
    });
  }, [startSave, propertyId, markup, nameOverride, notes, description, images,
      maxGuests, bedrooms, bathrooms, checkIn, checkOut, amenities, tags,
      houseRules, area, lat, lng, startCountdown]);

  const handleUndoLeave = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    pendingNavHref.current = null;
    setCountdown(null);
  }, []);

  const handleDismissToast = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    const href = pendingNavHref.current;
    pendingNavHref.current = null;
    setCountdown(null);
    if (href) router.push(href);
  }, [router]);

  function handleVisibilityToggle(val: boolean) {
    if (!val) {
      // Show reason modal before hiding
      setShowHideModal(true);
      return;
    }
    // Turning on — save immediately, no reason needed
    setIsVisible(true);
    startSave(async () => {
      const r = await updateElivaasPropertySetting(propertyId, { isVisible: true });
      if (r.success) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    });
  }

  function handleHideConfirm(reason: string) {
    setShowHideModal(false);
    setIsVisible(false);
    startSave(async () => {
      const r = await updateElivaasPropertySetting(propertyId, {
        isVisible: false,
        adminNotes: reason,
      });
      if (r.success) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    });
  }

  function num(v: string): number | null {
    const n = parseInt(v);
    return isNaN(n) ? null : n;
  }

  async function handleSave() {
    setSaveErr("");
    startSave(async () => {
      const r = await updateElivaasPropertySetting(propertyId, {
        markupPercentage:     parseInt(markup)   || 20,
        displayNameOverride:  nameOverride.trim() || null,
        adminNotes:           notes.trim()       || null,
        descriptionOverride:  description.trim() || null,
        imagesOverride:       images.trim()      || null,
        maxGuestsOverride:    num(maxGuests),
        bedroomCountOverride: num(bedrooms),
        bathroomCountOverride:num(bathrooms),
        bedsCountOverride:    num(beds),
        checkInTimeOverride:  checkIn.trim()     || null,
        checkOutTimeOverride: checkOut.trim()    || null,
        amenitiesOverride:    amenities.trim()   || null,
        tagsOverride:         tags.trim()        || null,
        houseRulesOverride:      houseRules.trim()     || null,
        faqsOverride:            faqs.filter(f => f.q.trim() || f.a.trim()).length > 0 ? JSON.stringify(faqs.filter(f => f.q.trim() || f.a.trim())) : null,
        spacesOverride:          spaces.filter(s => s.title.trim() || s.description.trim()).length > 0 ? JSON.stringify(spaces.filter(s => s.title.trim() || s.description.trim())) : null,
        sectionsOverride:        sections.filter(s => s.title.trim() || s.content.trim()).length > 0 ? JSON.stringify(sections.filter(s => s.title.trim() || s.content.trim())) : null,
        priceAmountOverride:     num(priceOverride),
        securityDepositOverride: num(securityDeposit),
        extraAdultRateOverride:  num(extraAdult),
        extraChildRateOverride:  num(extraChild),
        areaOverride:            area.trim()           || null,
        latOverride:             lat.trim()            || null,
        lngOverride:             lng.trim()            || null,
      });
      if (r.success) {
        isDirty.current = false;
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setSaveErr("Save failed — try again");
      }
    });
  }

  // Indicators for filled sections
  const displayFilled  = !!(nameOverride || description);
  const capacityFilled = !!(maxGuests || bedrooms || bathrooms || checkIn || checkOut);
  const contentFilled  = !!(images || amenities || tags || houseRules);
  const locationFilled = !!(area || lat || lng);

  return (
    <>
    {showHideModal && (
      <HideReasonModal
        onConfirm={handleHideConfirm}
        onCancel={() => setShowHideModal(false)}
        saving={saving}
      />
    )}
    {showUnsavedModal && (
      <UnsavedModal
        onLeave={handleLeave}
        onStay={handleStay}
        onSaveAndLeave={handleSaveAndLeave}
        saving={saving}
      />
    )}
    {countdown !== null && (
      <LeaveCountdownToast
        seconds={countdown}
        onUndo={handleUndoLeave}
        onDismiss={handleDismissToast}
      />
    )}
    <div
      className={`rounded-lg transition-opacity ${
        isVisible ? "" : "opacity-60"
      }`}
    >
      {/* Elivaas data summary */}
      {(cat.imageCount || cat.amenityCount || cat.maxOccupancy || cat.firstImageUrl) && (
        <div className="flex flex-wrap gap-2 mb-3 p-2 rounded-lg bg-blue-50 border border-blue-100">
          {cat.firstImageUrl && (
            <img src={cat.firstImageUrl} alt="" className="w-14 h-10 object-cover rounded" />
          )}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[11px] font-medium text-blue-500">From Elivaas:</span>
            {cat.maxOccupancy  && <span className="text-[11px] bg-white border border-blue-100 text-blue-700 px-1.5 py-0.5 rounded">👥 {cat.maxOccupancy} guests</span>}
            {cat.imageCount    && <span className="text-[11px] bg-white border border-blue-100 text-blue-700 px-1.5 py-0.5 rounded">🖼 {cat.imageCount} images</span>}
            {cat.amenityCount  && <span className="text-[11px] bg-white border border-blue-100 text-blue-700 px-1.5 py-0.5 rounded">✓ {cat.amenityCount} amenities</span>}
          </div>
        </div>
      )}

      {/* Visibility row — always visible */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex flex-col gap-1">
          <ToggleSwitch
            checked={isVisible}
            onChange={handleVisibilityToggle}
            disabled={saving}
            label={isVisible ? "Visible on website" : "Hidden from website"}
          />
          {!isVisible && init.adminNotes && (
            <span className="text-[11px] text-gray-400 pl-1">Reason: {init.adminNotes}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saved    && <span className="text-xs text-emerald-600">Saved ✓</span>}
          {saveErr  && <span className="text-xs text-red-500">{saveErr}</span>}
          <Button
            size="xs"
            color="success"
            href={`/admin/elivaas/book?propertyId=${propertyId}&propertyName=${encodeURIComponent(propertyName)}${checkinDate ? `&checkinDate=${checkinDate}&checkoutDate=${checkoutDate}&adults=${adults}&children=${children}` : ""}`}
            as="a"
          >
            {checkinDate ? "Book →" : "Book"}
          </Button>
          <Button size="xs" color="dark" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save All"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {/* Pricing & Notes */}
        <Section title="Pricing & Notes" defaultOpen>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Markup %" hint="(default 20)">
              <TextInput
                type="number"
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
                min={0} max={200} sizing="sm" addon="%"
              />
            </Field>
            <Field label="Admin Notes" hint="(internal only)">
              <TextInput
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes…"
                sizing="sm"
              />
            </Field>
          </div>
        </Section>

        {/* Display */}
        <Section title="Display" badge={displayFilled ? "edited" : undefined}>
          <Field label="Display Name Override" hint="(replaces Elivaas name for customers)">
            <TextInput
              value={nameOverride}
              onChange={(e) => setNameOverride(e.target.value)}
              placeholder={propertyName}
              sizing="sm"
            />
          </Field>
          <Field label="Description" hint="(shown on detail page)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write a custom description for customers…"
              rows={4}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </Field>
        </Section>

        {/* Capacity & Timing */}
        <Section title="Capacity & Timing" badge={capacityFilled ? "edited" : undefined}>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Max Guests">
              <TextInput
                type="number" min={1}
                value={maxGuests}
                onChange={(e) => setMaxGuests(e.target.value)}
                placeholder="—"
                sizing="sm"
              />
            </Field>
            <Field label="Bedrooms">
              <TextInput
                type="number" min={0}
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                placeholder="—"
                sizing="sm"
              />
            </Field>
            <Field label="Bathrooms">
              <TextInput
                type="number" min={0}
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                placeholder="—"
                sizing="sm"
              />
            </Field>
            <Field label="Beds">
              <TextInput
                type="number" min={0}
                value={beds}
                onChange={(e) => setBeds(e.target.value)}
                placeholder="—"
                sizing="sm"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Check-in Time">
              <TextInput
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                placeholder="e.g. 2:00 PM"
                sizing="sm"
              />
            </Field>
            <Field label="Check-out Time">
              <TextInput
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                placeholder="e.g. 11:00 AM"
                sizing="sm"
              />
            </Field>
          </div>
        </Section>

        {/* Content */}
        <Section title="Content — Images, Amenities, Tags, Rules" badge={contentFilled ? "edited" : undefined}>
          <Field label="Images" hint="(one URL per line)">
            <textarea
              value={images}
              onChange={(e) => setImages(e.target.value)}
              placeholder={"https://cdn.example.com/img1.jpg\nhttps://cdn.example.com/img2.jpg"}
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </Field>
          <Field label="Amenities" hint="(comma-separated)">
            <TextInput
              value={amenities}
              onChange={(e) => setAmenities(e.target.value)}
              placeholder="Swimming Pool, BBQ, Air Conditioning, WiFi"
              sizing="sm"
            />
          </Field>
          <Field label="Tags" hint="(comma-separated, e.g. collection tags)">
            <TextInput
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="luxury, pool, family-friendly"
              sizing="sm"
            />
          </Field>
          <Field label="House Rules" hint="(one rule per line)">
            <textarea
              value={houseRules}
              onChange={(e) => setHouseRules(e.target.value)}
              placeholder={"No smoking\nNo pets\nCheck-out by 11 AM"}
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </Field>
          <Field label="FAQs">
            <div className="flex flex-col gap-2">
              {faqs.map((faq, i) => (
                <div key={i} className="flex flex-col gap-1 rounded border border-gray-200 bg-gray-50 p-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-semibold text-gray-400 w-4">Q</span>
                    <TextInput
                      value={faq.q}
                      onChange={(e) => setFaqs(prev => prev.map((f, j) => j === i ? { ...f, q: e.target.value } : f))}
                      placeholder="Question"
                      sizing="sm"
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setFaqs(prev => prev.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600 text-xs px-1"
                      title="Remove"
                    >✕</button>
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="text-[10px] font-semibold text-gray-400 w-4 pt-1.5">A</span>
                    <Textarea
                      value={faq.a}
                      onChange={(e) => setFaqs(prev => prev.map((f, j) => j === i ? { ...f, a: e.target.value } : f))}
                      placeholder="Answer"
                      rows={2}
                      className="flex-1 text-xs"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setFaqs(prev => [...prev, { q: "", a: "" }])}
                className="text-xs text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 rounded px-3 py-1.5 w-full text-center"
              >
                + Add FAQ
              </button>
            </div>
          </Field>
        </Section>

        {/* Spaces / Rooms */}
        <Section title="Spaces & Rooms" badge={spaces.length > 0 ? `${spaces.length}` : undefined}>
          <Field label="Rooms / Spaces" hint="(each space has a title + description)">
            <div className="space-y-2">
              {spaces.map((sp, i) => (
                <div key={i} className="flex gap-2 items-start border border-gray-100 rounded-lg p-2">
                  <div className="flex-1 space-y-1">
                    <TextInput
                      value={sp.title}
                      placeholder="Room title (e.g. Master Bedroom)"
                      sizing="sm"
                      onChange={(e) => setSpaces(prev => prev.map((s, j) => j === i ? { ...s, title: e.target.value } : s))}
                    />
                    <Textarea
                      value={sp.description}
                      placeholder="Description…"
                      rows={2}
                      className="text-xs"
                      onChange={(e) => setSpaces(prev => prev.map((s, j) => j === i ? { ...s, description: e.target.value } : s))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSpaces(prev => prev.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 text-xs mt-1"
                  >✕</button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSpaces(prev => [...prev, { title: "", description: "" }])}
                className="text-xs text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 rounded px-3 py-1.5 w-full text-center"
              >+ Add Space</button>
            </div>
          </Field>
        </Section>

        {/* Content Sections */}
        <Section title="Content Sections" badge={sections.length > 0 ? `${sections.length}` : undefined}>
          <Field label="Sections" hint="(rich content blocks like highlights, story, etc.)">
            <div className="space-y-2">
              {sections.map((sec, i) => (
                <div key={i} className="flex gap-2 items-start border border-gray-100 rounded-lg p-2">
                  <div className="flex-1 space-y-1">
                    <TextInput
                      value={sec.title}
                      placeholder="Section title (e.g. About the Property)"
                      sizing="sm"
                      onChange={(e) => setSections(prev => prev.map((s, j) => j === i ? { ...s, title: e.target.value } : s))}
                    />
                    <Textarea
                      value={sec.content}
                      placeholder="Content…"
                      rows={3}
                      className="text-xs"
                      onChange={(e) => setSections(prev => prev.map((s, j) => j === i ? { ...s, content: e.target.value } : s))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSections(prev => prev.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 text-xs mt-1"
                  >✕</button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSections(prev => [...prev, { title: "", content: "", slug: "" }])}
                className="text-xs text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 rounded px-3 py-1.5 w-full text-center"
              >+ Add Section</button>
            </div>
          </Field>
        </Section>

        {/* Extra Pricing */}
        <Section title="Pricing" badge={!!(priceOverride || securityDeposit || extraAdult || extraChild) ? "edited" : undefined}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Indicative Price Override" hint="(₹/night, shown on search card)">
              <TextInput type="number" min={0} value={priceOverride} onChange={(e) => setPriceOverride(e.target.value)} placeholder="Leave blank to use synced price" sizing="sm" />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Security Deposit" hint="(₹)">
              <TextInput type="number" min={0} value={securityDeposit} onChange={(e) => setSecurityDeposit(e.target.value)} placeholder="—" sizing="sm" />
            </Field>
            <Field label="Extra Adult" hint="(₹/person)">
              <TextInput type="number" min={0} value={extraAdult} onChange={(e) => setExtraAdult(e.target.value)} placeholder="—" sizing="sm" />
            </Field>
            <Field label="Extra Child" hint="(₹/person)">
              <TextInput type="number" min={0} value={extraChild} onChange={(e) => setExtraChild(e.target.value)} placeholder="—" sizing="sm" />
            </Field>
          </div>
        </Section>

        {/* Location */}
        <Section title="Location" badge={locationFilled ? "edited" : undefined}>
          <Field label="Area / Locality Name">
            <TextInput
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. Karjat, Lonavala"
              sizing="sm"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude">
              <TextInput
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="18.9220"
                sizing="sm"
              />
            </Field>
            <Field label="Longitude">
              <TextInput
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="73.3490"
                sizing="sm"
              />
            </Field>
          </div>
        </Section>
      </div>
    </div>
    </>
  );
}
