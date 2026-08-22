"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type FinanceRecordDialogProps = {
  title: string;
  record: unknown;
};

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isDateLike(value: string) {
  return /^\d{4}-\d{2}-\d{2}/.test(value);
}

function badgeClass(value: string) {
  const normalized = value.toUpperCase();
  if (["PAID", "COMPLETED", "CONFIRMED", "SUCCESS", "ACTIVE", "AVAILABLE"].includes(normalized)) {
    return "bg-green-500/15 text-green-300 ring-1 ring-green-400/20";
  }
  if (["PENDING", "PROCESSING", "REQUESTED", "QUEUED", "HOLD"].includes(normalized)) {
    return "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/20";
  }
  if (["FAILED", "CANCELLED", "CANCELED", "REFUNDED", "DEBIT"].includes(normalized)) {
    return "bg-red-500/15 text-red-300 ring-1 ring-red-400/20";
  }
  return "bg-slate-500/15 text-slate-200 ring-1 ring-slate-400/20";
}

function formatPrimitive(value: unknown) {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString("en-IN") : "N/A";
  if (typeof value === "string" && isDateLike(value)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString("en-IN");
    }
  }
  return String(value);
}

function titleCase(input: string) {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function renderPrimitive(value: unknown) {
  const formatted = formatPrimitive(value);
  const stringValue = typeof formatted === "string" ? formatted : String(formatted);

  if (
    typeof value === "string" &&
    ["PENDING", "PROCESSING", "REQUESTED", "QUEUED", "HOLD", "PAID", "COMPLETED", "CONFIRMED", "SUCCESS", "ACTIVE", "AVAILABLE", "FAILED", "CANCELLED", "CANCELED", "REFUNDED", "DEBIT"].includes(value.toUpperCase())
  ) {
    return (
      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(value)}`}>
        {stringValue}
      </span>
    );
  }

  if (typeof value === "string" && isUuidLike(value)) {
    return <span className="font-mono text-[13px] text-slate-100">{stringValue}</span>;
  }

  if (stringValue === "N/A") {
    return <span className="text-slate-400">N/A</span>;
  }

  return <span className="text-[15px] font-medium text-white">{stringValue}</span>;
}

function renderValue(value: unknown, depth = 0): ReactNode {
  if (depth > 3) {
    return <div className="text-xs text-gray-500 dark:text-gray-400">Nested data truncated.</div>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <div className="text-sm text-gray-500 dark:text-gray-400">No entries.</div>;
    }

    return (
      <div className="space-y-3">
        {value.map((item, index) => (
          <div
            key={index}
            className="rounded-2xl border border-slate-700/80 bg-slate-900/80 p-4 shadow-sm"
          >
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Item {index + 1}
            </div>
            {renderValue(item, depth + 1)}
          </div>
        ))}
      </div>
    );
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);

    if (entries.length === 0) {
      return <div className="text-sm text-gray-500 dark:text-gray-400">No fields.</div>;
    }

    const primitiveEntries = entries.filter(([, nestedValue]) => {
      return !(Array.isArray(nestedValue) || (nestedValue && typeof nestedValue === "object"));
    });
    const nestedEntries = entries.filter(([, nestedValue]) => {
      return Array.isArray(nestedValue) || (nestedValue && typeof nestedValue === "object");
    });

    return (
      <div className="space-y-4">
        {primitiveEntries.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {primitiveEntries.map(([key, nestedValue]) => (
              <div
                key={key}
                className="rounded-xl border border-slate-700 bg-slate-950/65 px-4 py-3 shadow-sm"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {titleCase(key)}
                </div>
                <div className="mt-2 break-words">{renderPrimitive(nestedValue)}</div>
              </div>
            ))}
          </div>
        ) : null}

        {nestedEntries.map(([key, nestedValue]) => (
          <div
            key={key}
            className="overflow-hidden rounded-2xl border border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.96)_0%,rgba(15,23,42,0.78)_100%)] shadow-sm"
          >
            <div className="border-b border-slate-700/80 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {titleCase(key)}
              </div>
            </div>
            <div className="p-4">{renderValue(nestedValue, depth + 1)}</div>
          </div>
        ))}
      </div>
    );
  }

  return <>{renderPrimitive(value)}</>;
}

export default function FinanceRecordDialog({ title, record }: FinanceRecordDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const normalizedTitle = useMemo(() => title.trim() || "Record details", [title]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const modalContent =
    isOpen && isMounted ? (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm">
        <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-slate-700 bg-[linear-gradient(180deg,rgba(30,41,59,0.98)_0%,rgba(15,23,42,0.98)_100%)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
            <div>
              <h3 className="text-xl font-semibold text-white">{normalizedTitle}</h3>
              <p className="mt-1 text-sm text-slate-400">
                Structured record detail for investigation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full border border-slate-600 px-3 py-1 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
            >
              Close
            </button>
          </div>

          <div className="overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_24%)] px-6 py-5">
            {renderValue(record)}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="font-medium text-blue-600 transition hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
      >
        Inspect
      </button>
      {modalContent ? createPortal(modalContent, document.body) : null}
    </>
  );
}
