"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Label,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  TextInput,
} from "flowbite-react";

import {
  blockPropertyDateRange,
  bulkUpdatePropertyField,
  bulkUpdatePropertyGST,
  fetchPropertiesForView,
  patchPropertyViewFields,
} from "@/actions/propertyViewActions";
import ConfirmModal from "@/components/ConfirmModal";

type Row = {
  id: string;
  propertyName?: string;
  propertyCode?: string | null;
  weekdayPrice?: number | null;
  weekendPrice?: number | null;
  weekendSaturdayPrice?: number | null;
  weekdayAdultExtraGuestCharge?: number | null;
  weekdayChildExtraGuestCharge?: number | null;
  mondayFloatingAdultExtraGuestCharge?: number | null;
  weekdayDiscount?: number | null;
  weekdayGSTslab?: number | null;
  owner?: { name?: string; phone?: string } | null;
  manager?: { name?: string; phone?: string } | null;
  caretaker?: { name?: string; phone?: string } | null;
  bookedDates?: string[];
};

const toNumber = (v: string): number => {
  if (v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function PropertyViewDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);
  const [isApplyingGst, setIsApplyingGst] = useState(false);
  const [isApplyingDateBlock, setIsApplyingDateBlock] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;
  const [gstMode, setGstMode] = useState<"percentage" | "value">("percentage");
  const [gstType, setGstType] = useState<"increase" | "decrease" | "set">("increase");
  const [gstAmount, setGstAmount] = useState<string>("0");
  const [bulkField, setBulkField] = useState<string>("weekdayPrice");
  const [bulkMode, setBulkMode] = useState<"percentage" | "value">("percentage");
  const [bulkType, setBulkType] = useState<"increase" | "decrease" | "set">("increase");
  const [bulkAmount, setBulkAmount] = useState<string>("0");
  const [search, setSearch] = useState<string>("");
  const [blockFrom, setBlockFrom] = useState<Date | null>(null);
  const [blockTo, setBlockTo] = useState<Date | null>(null);
  const [dateBlockMode, setDateBlockMode] = useState<"block" | "unblock">("block");
  const [blockPropertySearch, setBlockPropertySearch] = useState<string>("");
  const [blockTargetPropertyIds, setBlockTargetPropertyIds] = useState<string[]>([]);
  const [blockApplyToAll, setBlockApplyToAll] = useState(false);
  const [showPriceConfirmModal, setShowPriceConfirmModal] = useState(false);
  const [priceConfirmText, setPriceConfirmText] = useState<string>("");
  const [pendingPriceAction, setPendingPriceAction] = useState<null | (() => Promise<void>)>(null);

  const load = async () => {
    setIsLoadingRows(true);
    try {
      const res = await fetchPropertiesForView();
      if (res.data) setRows(res.data as Row[]);
      if (res.error) toast.error(res.error);
    } finally {
      setIsLoadingRows(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleSelected = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const needle = search.toLowerCase();
    return rows.filter((r) => {
      const owner = `${r.owner?.name || ""} ${r.owner?.phone || ""}`.toLowerCase();
      const manager = `${r.manager?.name || ""} ${r.manager?.phone || ""}`.toLowerCase();
      const caretaker = `${r.caretaker?.name || ""} ${r.caretaker?.phone || ""}`.toLowerCase();
      const code = (r.propertyCode || "").toLowerCase();
      return (
        (r.propertyName || "").toLowerCase().includes(needle) ||
        r.id.toLowerCase().includes(needle) ||
        code.includes(needle) ||
        owner.includes(needle) ||
        manager.includes(needle) ||
        caretaker.includes(needle)
      );
    });
  }, [rows, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page]);

  const allSelected = useMemo(
    () => paginatedRows.length > 0 && paginatedRows.every((r) => selected.includes(r.id)),
    [selected, paginatedRows]
  );

  const calendarBlockedDateStrings = useMemo(() => {
    const set = new Set<string>();
    if (blockApplyToAll) {
      for (const r of rows) (r.bookedDates || []).forEach((d) => set.add(d));
      return Array.from(set);
    }
    if (blockTargetPropertyIds.length === 0) return [];
    for (const id of blockTargetPropertyIds) {
      const r = rows.find((x) => x.id === id);
      (r?.bookedDates || []).forEach((d) => set.add(d));
    }
    return Array.from(set);
  }, [blockApplyToAll, blockTargetPropertyIds, rows]);

  const blockedDateObjects = useMemo(() => {
    return calendarBlockedDateStrings
      .map((d) => {
        const [y, m, day] = d.split("-").map(Number);
        if (!y || !m || !day) return null;
        return new Date(y, m - 1, day);
      })
      .filter((d): d is Date => Boolean(d));
  }, [calendarBlockedDateStrings]);

  const blockedDateSet = useMemo(() => new Set(calendarBlockedDateStrings), [calendarBlockedDateStrings]);

  const blockPropertyPickCandidates = useMemo(() => {
    if (blockApplyToAll) return [];
    const q = blockPropertySearch.trim().toLowerCase();
    if (!q) return [];
    return rows
      .filter((r) => !blockTargetPropertyIds.includes(r.id))
      .filter((r) => {
        const name = (r.propertyName || "").toLowerCase();
        const code = (r.propertyCode || "").toLowerCase();
        return name.includes(q) || code.includes(q) || r.id.toLowerCase().includes(q);
      })
      .slice(0, 20);
  }, [rows, blockPropertySearch, blockTargetPropertyIds, blockApplyToAll]);

  const dayCount = blockFrom && blockTo
    ? Math.round((blockTo.getTime() - blockFrom.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : null;
  const targetCount = blockApplyToAll ? rows.length : blockTargetPropertyIds.length;

  const ymd = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const onFieldBlur = async (id: string, field: string, value: string) => {
    const res = await patchPropertyViewFields(id, { [field]: toNumber(value) });
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Saved");
    await load();
  };

  const openPriceConfirmation = (text: string, action: () => Promise<void>) => {
    setPriceConfirmText(text);
    setPendingPriceAction(() => action);
    setShowPriceConfirmModal(true);
  };

  const handleConfirmPriceAction = async () => {
    if (!pendingPriceAction) return;
    await pendingPriceAction();
    setShowPriceConfirmModal(false);
    setPendingPriceAction(null);
    setPriceConfirmText("");
  };

  const handleClosePriceModal = () => {
    setShowPriceConfirmModal(false);
    setPendingPriceAction(null);
    setPriceConfirmText("");
  };

  const confirmAndApplyFieldUpdate = (id: string, field: string, value: string, currentValue: number) => {
    const nextValue = toNumber(value);
    if (nextValue === currentValue) return;
    openPriceConfirmation(`Apply this price update from ${currentValue} to ${nextValue}?`, async () => {
      await onFieldBlur(id, field, value);
    });
  };

  const gstPreview = (base: number, slab: number) => {
    const gst = (base * slab) / 100;
    return { gst, total: base + gst };
  };

  const applyBulkGst = async () => {
    const targetRows = (selected.length > 0 ? rows.filter((r) => selected.includes(r.id)) : filteredRows).map(
      (r) => ({ id: r.id, value: Number(r.weekdayGSTslab || 0) })
    );
    if (targetRows.length === 0) return;
    const targetLabel = selected.length > 0 ? `${selected.length} selected` : `${filteredRows.length} filtered`;
    openPriceConfirmation(
      `Apply GST update (${gstType} ${gstAmount} in ${gstMode} mode) to ${targetLabel} properties?`,
      async () => {
        setIsApplyingGst(true);
        const res = await bulkUpdatePropertyGST(targetRows, gstMode, gstType, toNumber(gstAmount));
        if (res.error) toast.error(res.error);
        else toast.success("GST updated");
        await load();
        setIsApplyingGst(false);
      }
    );
  };

  const applyBulkFieldUpdate = async () => {
    const targetRows = (selected.length > 0 ? rows.filter((r) => selected.includes(r.id)) : filteredRows).map(
      (r) => ({ id: r.id, value: Number((r as any)[bulkField] || 0) })
    );
    if (targetRows.length === 0) return;
    const targetLabel = selected.length > 0 ? `${selected.length} selected` : `${filteredRows.length} filtered`;
    openPriceConfirmation(
      `Apply bulk price update (${bulkType} ${bulkAmount} in ${bulkMode} mode) to ${targetLabel} properties?`,
      async () => {
        setIsApplyingBulk(true);
        const res = await bulkUpdatePropertyField(
          targetRows,
          bulkField,
          bulkMode,
          bulkType,
          toNumber(bulkAmount)
        );
        if (res.error) toast.error(res.error);
        else toast.success("Bulk update applied");
        await load();
        setIsApplyingBulk(false);
      }
    );
  };

  const applyDateBlock = async () => {
    if (!blockFrom || !blockTo) {
      toast.error("Select a date range");
      return;
    }
    const targetRows = (blockApplyToAll ? rows : rows.filter((r) => blockTargetPropertyIds.includes(r.id))).map(
      (r) => ({ id: r.id, bookedDates: r.bookedDates || [] })
    );
    if (targetRows.length === 0) {
      toast.error("Choose All properties or add at least one property");
      return;
    }
    const from = ymd(blockFrom);
    const to = ymd(blockTo);
    const operationLabel = dateBlockMode === "block" ? "Block" : "Unblock";
    openPriceConfirmation(`${operationLabel} dates from ${from} to ${to} for ${targetRows.length} properties?`, async () => {
      setIsApplyingDateBlock(true);
      const res = await blockPropertyDateRange(targetRows, from, to, dateBlockMode);
      if (res.error) toast.error(res.error);
      else toast.success(dateBlockMode === "block" ? "Dates blocked successfully" : "Dates unblocked successfully");
      setBlockFrom(null);
      setBlockTo(null);
      await load();
      setIsApplyingDateBlock(false);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h3 className="text-md font-semibold mb-3">Bulk Update (Any Pricing Field)</h3>
        <p className="text-xs text-gray-500 mb-3">
          Supports increase/decrease/set using percentage or value for the selected field.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <Label>Field</Label>
            <Select value={bulkField} onChange={(e) => setBulkField(e.target.value)}>
              <option value="weekdayPrice">Weekdays</option>
              <option value="weekendPrice">Weekends</option>
              <option value="weekendSaturdayPrice">Sat</option>
              <option value="weekdayAdultExtraGuestCharge">Extra Adult</option>
              <option value="weekdayChildExtraGuestCharge">Child</option>
              <option value="weekdayDiscount">Discount</option>
              <option value="weekdayGSTslab">GST Slab</option>
            </Select>
          </div>
          <div>
            <Label>Action</Label>
            <Select value={bulkType} onChange={(e) => setBulkType(e.target.value as any)}>
              <option value="increase">Increase</option>
              <option value="decrease">Decrease</option>
              <option value="set">Set</option>
            </Select>
          </div>
          <div>
            <Label>Mode</Label>
            <Select value={bulkMode} onChange={(e) => setBulkMode(e.target.value as any)}>
              <option value="value">Value</option>
              <option value="percentage">Percentage</option>
            </Select>
          </div>
          <div>
            <Label>Amount</Label>
            <TextInput value={bulkAmount} onChange={(e) => setBulkAmount(e.target.value)} />
          </div>
          <Button onClick={applyBulkFieldUpdate} disabled={isApplyingBulk || isLoadingRows}>
            {isApplyingBulk ? "Applying..." : `Apply to ${selected.length > 0 ? `${selected.length} selected` : "filtered rows"}`}
          </Button>
        </div>
      </Card>

      <Card>
        <h3 className="text-md font-semibold mb-3">GST Bulk Control</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <Label>Change Type</Label>
            <Select value={gstType} onChange={(e) => setGstType(e.target.value as any)}>
              <option value="increase">Increase</option>
              <option value="decrease">Decrease</option>
              <option value="set">Set</option>
            </Select>
          </div>
          <div>
            <Label>Mode</Label>
            <Select value={gstMode} onChange={(e) => setGstMode(e.target.value as any)}>
              <option value="percentage">Percentage</option>
              <option value="value">Value</option>
            </Select>
          </div>
          <div>
            <Label>Amount</Label>
            <TextInput value={gstAmount} onChange={(e) => setGstAmount(e.target.value)} />
          </div>
          <Button onClick={applyBulkGst} disabled={isApplyingGst || isLoadingRows}>
            {isApplyingGst ? "Applying..." : `Apply to ${selected.length > 0 ? `${selected.length} selected` : "all properties"}`}
          </Button>
        </div>
      </Card>

      <Card>
        <h3 className="text-md font-semibold mb-1">Date Blocking / Availability</h3>
        <p className="text-sm text-gray-500 mb-4">
          Pick properties, choose an action, then select a date range.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column — Property selection */}
          <div className="space-y-3">
            <Label className="block font-semibold">Properties</Label>

            {/* "Use from table" banner */}
            {selected.length > 0 && !blockApplyToAll ? (
              <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-800 dark:bg-blue-900/20">
                <span className="text-sm text-blue-800 dark:text-blue-300">
                  {selected.length} {selected.length === 1 ? "property" : "properties"} selected in table
                </span>
                <button
                  type="button"
                  className="rounded-md border border-blue-300 px-3 py-1 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/40"
                  onClick={() => {
                    setBlockApplyToAll(false);
                    setBlockTargetPropertyIds(selected);
                    setBlockPropertySearch("");
                  }}
                >
                  Use these {selected.length}
                </button>
              </div>
            ) : null}

            {/* All / Specific toggle pill */}
            <div className="flex overflow-hidden rounded-lg border border-gray-200 bg-gray-100 p-0.5 gap-0.5 dark:border-gray-700 dark:bg-gray-700">
              <button
                type="button"
                onClick={() => { setBlockApplyToAll(true); setBlockTargetPropertyIds([]); setBlockPropertySearch(""); }}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${
                  blockApplyToAll
                    ? "bg-white shadow-sm text-gray-900 dark:bg-gray-800 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                All ({rows.length})
              </button>
              <button
                type="button"
                onClick={() => setBlockApplyToAll(false)}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${
                  !blockApplyToAll
                    ? "bg-white shadow-sm text-gray-900 dark:bg-gray-800 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                Specific
              </button>
            </div>

            {/* Search with floating dropdown (Specific mode only) */}
            {!blockApplyToAll ? (
              <div className="relative">
                <TextInput
                  value={blockPropertySearch}
                  onChange={(e) => setBlockPropertySearch(e.target.value)}
                  placeholder="Search by name, code, or id…"
                  disabled={isLoadingRows}
                />
                {blockPropertyPickCandidates.length > 0 ? (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg divide-y divide-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:divide-gray-700">
                    {blockPropertyPickCandidates.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        onClick={() => {
                          setBlockTargetPropertyIds((prev) => prev.includes(r.id) ? prev : [...prev, r.id]);
                          setBlockPropertySearch("");
                        }}
                      >
                        {(r.propertyCode ? `${r.propertyCode} — ` : "") + (r.propertyName || r.id)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Count summary + clear */}
            {(blockApplyToAll || blockTargetPropertyIds.length > 0) ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {blockApplyToAll
                    ? `All ${rows.length} properties targeted`
                    : `${blockTargetPropertyIds.length} ${blockTargetPropertyIds.length === 1 ? "property" : "properties"} selected`}
                </span>
                <button
                  type="button"
                  className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  onClick={() => { setBlockApplyToAll(false); setBlockTargetPropertyIds([]); }}
                >
                  Clear all
                </button>
              </div>
            ) : null}

            {/* Selected property chips */}
            {!blockApplyToAll && blockTargetPropertyIds.length > 0 ? (
              <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">
                {blockTargetPropertyIds.map((id) => {
                  const r = rows.find((x) => x.id === id);
                  const code = r?.propertyCode;
                  const name = r?.propertyName || id;
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                    >
                      {code ? (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          {code}
                        </span>
                      ) : null}
                      <span className="max-w-36 truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                        {name}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${name}`}
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        onClick={() => setBlockTargetPropertyIds((prev) => prev.filter((x) => x !== id))}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Right column — Action config */}
          <div className="flex flex-col gap-4">
            {/* Block / Unblock toggle pill */}
            <div>
              <Label className="mb-2 block font-semibold">Action</Label>
              <div className="flex overflow-hidden rounded-lg border border-gray-200 bg-gray-100 p-0.5 gap-0.5 dark:border-gray-700 dark:bg-gray-700">
                <button
                  type="button"
                  onClick={() => setDateBlockMode("block")}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                    dateBlockMode === "block"
                      ? "bg-white shadow-sm text-red-600 dark:bg-gray-800 dark:text-red-400"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  Block
                </button>
                <button
                  type="button"
                  onClick={() => setDateBlockMode("unblock")}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                    dateBlockMode === "unblock"
                      ? "bg-white shadow-sm text-green-600 dark:bg-gray-800 dark:text-green-400"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  Unblock
                </button>
              </div>
            </div>

            {/* Date range picker */}
            <div>
              <Label className="mb-2 block font-semibold">Date range</Label>
              <DatePicker
                selected={blockFrom}
                onChange={(dates: any) => {
                  const [start, end] = dates as [Date | null, Date | null];
                  setBlockFrom(start);
                  setBlockTo(end);
                }}
                startDate={blockFrom}
                endDate={blockTo}
                selectsRange
                placeholderText="Click to select from and to dates"
                className="w-full p-3 border rounded-lg"
                minDate={dateBlockMode === "block" ? new Date() : undefined}
                disabled={isApplyingDateBlock || isLoadingRows}
                dateFormat="MMM d, yyyy"
                monthsShown={2}
                excludeDates={dateBlockMode === "block" ? blockedDateObjects : undefined}
                dayClassName={
                  dateBlockMode === "unblock"
                    ? (date) => (blockedDateSet.has(ymd(date)) ? "react-datepicker__day--disabled" : "")
                    : undefined
                }
                withPortal
              />
            </div>

            {/* Summary banner */}
            {(dayCount !== null || targetCount > 0) ? (
              <div className={`rounded-lg border px-3 py-2.5 text-sm ${
                dateBlockMode === "block"
                  ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                  : "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
              }`}>
                {dateBlockMode === "block" ? "Will block " : "Will unblock "}
                <strong>{dayCount !== null ? `${dayCount} day${dayCount === 1 ? "" : "s"}` : "? days"}</strong>
                {" for "}
                <strong>{targetCount > 0 ? `${targetCount} ${targetCount === 1 ? "property" : "properties"}` : "no properties yet"}</strong>
              </div>
            ) : null}

            {/* Apply button */}
            <div className="mt-auto">
              <button
                type="button"
                onClick={applyDateBlock}
                disabled={isApplyingDateBlock || isLoadingRows}
                className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                  dateBlockMode === "block"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {isApplyingDateBlock
                  ? "Applying…"
                  : dateBlockMode === "block"
                    ? "Block dates"
                    : "Unblock dates"}
              </button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-md font-semibold mb-2">Search view</h3>
        <p className="text-sm text-gray-500 mb-3">
          Filter the pricing table by property name, property code, id, owner, supervisor, or caretaker.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
          <div className="space-y-2">
            <Label>Search</Label>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <TextInput
                className="grow"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Individual property (name, code, id) or contact..."
              />
              <Button size="sm" color="light" className="whitespace-nowrap shrink-0" onClick={() => setSearch("")}>
                All properties
              </Button>
            </div>
          </div>
          <div className="text-sm text-gray-500 md:text-right">Showing {filteredRows.length} rows</div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Pricing & Contacts View</h2>
          <Badge color="info">DB update on confirmation</Badge>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <Table hoverable>
            <TableHead>
              <TableRow>
                <TableHeadCell>
                  <Checkbox
                    checked={allSelected}
                    onChange={() => {
                      const pageIds = paginatedRows.map((r) => r.id);
                      if (allSelected) setSelected((prev) => prev.filter((id) => !pageIds.includes(id)));
                      else setSelected((prev) => Array.from(new Set([...prev, ...pageIds])));
                    }}
                  />
                </TableHeadCell>
                <TableHeadCell>Property Name</TableHeadCell>
                <TableHeadCell>Weekdays</TableHeadCell>
                <TableHeadCell>Weekends</TableHeadCell>
                <TableHeadCell>Sat</TableHeadCell>
                <TableHeadCell>Extra Adult</TableHeadCell>
                <TableHeadCell>Child</TableHeadCell>
                <TableHeadCell>Floating</TableHeadCell>
                <TableHeadCell>Discount</TableHeadCell>
                <TableHeadCell>GST Slab</TableHeadCell>
                <TableHeadCell>Owner Name & Contact</TableHeadCell>
                <TableHeadCell>Supervisor Name & Contact</TableHeadCell>
                <TableHeadCell>Caretaker Name & Contact</TableHeadCell>
                <TableHeadCell>Price Preview</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {paginatedRows.map((row) => {
                const base = Number(row.weekdayPrice || 0);
                const weekendBase = Number(row.weekendPrice || 0);
                const satBase = Number(row.weekendSaturdayPrice || 0);
                const slab = Number(row.weekdayGSTslab || 0);
                const preview = gstPreview(base, slab);
                const weekendPreview = gstPreview(weekendBase, slab);
                const satPreview = gstPreview(satBase, slab);
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Checkbox checked={selected.includes(row.id)} onChange={() => toggleSelected(row.id)} />
                    </TableCell>
                    <TableCell>{row.propertyName || "-"}</TableCell>
                    <TableCell>
                      <TextInput
                        sizing="sm"
                        key={`${row.id}-weekday-${row.weekdayPrice ?? 0}`}
                        defaultValue={String(row.weekdayPrice ?? 0)}
                        onBlur={(e) => confirmAndApplyFieldUpdate(row.id, "weekdayPrice", e.target.value, Number(row.weekdayPrice ?? 0))}
                      />
                    </TableCell>
                    <TableCell>
                      <TextInput
                        sizing="sm"
                        key={`${row.id}-weekend-${row.weekendPrice ?? 0}`}
                        defaultValue={String(row.weekendPrice ?? 0)}
                        onBlur={(e) => confirmAndApplyFieldUpdate(row.id, "weekendPrice", e.target.value, Number(row.weekendPrice ?? 0))}
                      />
                    </TableCell>
                    <TableCell>
                      <TextInput
                        sizing="sm"
                        key={`${row.id}-sat-${row.weekendSaturdayPrice ?? 0}`}
                        defaultValue={String(row.weekendSaturdayPrice ?? 0)}
                        onBlur={(e) =>
                          confirmAndApplyFieldUpdate(row.id, "weekendSaturdayPrice", e.target.value, Number(row.weekendSaturdayPrice ?? 0))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextInput
                        sizing="sm"
                        key={`${row.id}-adult-${row.weekdayAdultExtraGuestCharge ?? 0}`}
                        defaultValue={String(row.weekdayAdultExtraGuestCharge ?? 0)}
                        onBlur={(e) =>
                          confirmAndApplyFieldUpdate(row.id, "weekdayAdultExtraGuestCharge", e.target.value, Number(row.weekdayAdultExtraGuestCharge ?? 0))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextInput
                        sizing="sm"
                        key={`${row.id}-child-${row.weekdayChildExtraGuestCharge ?? 0}`}
                        defaultValue={String(row.weekdayChildExtraGuestCharge ?? 0)}
                        onBlur={(e) =>
                          confirmAndApplyFieldUpdate(row.id, "weekdayChildExtraGuestCharge", e.target.value, Number(row.weekdayChildExtraGuestCharge ?? 0))
                        }
                      />
                    </TableCell>
                    <TableCell>{Number(row.mondayFloatingAdultExtraGuestCharge || 0)}</TableCell>
                    <TableCell>
                      <TextInput
                        sizing="sm"
                        key={`${row.id}-discount-${row.weekdayDiscount ?? 0}`}
                        defaultValue={String(row.weekdayDiscount ?? 0)}
                        onBlur={(e) =>
                          confirmAndApplyFieldUpdate(row.id, "weekdayDiscount", e.target.value, Number(row.weekdayDiscount ?? 0))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextInput
                        sizing="sm"
                        key={`${row.id}-gst-${row.weekdayGSTslab ?? 0}`}
                        defaultValue={String(row.weekdayGSTslab ?? 0)}
                        onBlur={(e) => confirmAndApplyFieldUpdate(row.id, "weekdayGSTslab", e.target.value, Number(row.weekdayGSTslab ?? 0))}
                      />
                    </TableCell>
                    <TableCell>{row.owner?.name || "-"} {row.owner?.phone ? `(${row.owner.phone})` : ""}</TableCell>
                    <TableCell>{row.manager?.name || "-"} {row.manager?.phone ? `(${row.manager.phone})` : ""}</TableCell>
                    <TableCell>{row.caretaker?.name || "-"} {row.caretaker?.phone ? `(${row.caretaker.phone})` : ""}</TableCell>
                    <TableCell>WD: {preview.total.toFixed(0)} | WE: {weekendPreview.total.toFixed(0)} | SAT: {satPreview.total.toFixed(0)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">Page {page} of {totalPages} ({filteredRows.length} total rows)</div>
          <div className="flex gap-2">
            <Button size="xs" color="gray" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
            <Button size="xs" color="gray" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        </div>
      </Card>

      <ConfirmModal
        showModal={showPriceConfirmModal}
        confirmationText={priceConfirmText}
        acceptCallback={() => {
          void handleConfirmPriceAction();
        }}
        closeCallback={handleClosePriceModal}
        loading={isApplyingBulk || isApplyingGst || isApplyingDateBlock}
      />
    </div>
  );
}
