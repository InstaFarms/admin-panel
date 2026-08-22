"use client";

import {
  STAFF_ACTIVITY_CATEGORY_LABELS,
  STAFF_ACTIVITY_ROLE_LABELS,
} from "@/constants/staffActivity";
import {
  formatActivityDuration,
  formatStaffActivityTimestamp,
  maskedPhoneHint,
} from "@/lib/staffActivityUtils";
import type { StaffActivityRow } from "@/types/staffActivity";
import {
  Building2,
  Check,
  Clipboard,
  Copy,
  ExternalLink,
  FileJson2,
  MonitorSmartphone,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface ActivityLogDetailDrawerProps {
  activity: StaffActivityRow | null;
  onClose: () => void;
}

function DetailField({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | number | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-800/70">
      <dt className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium break-words text-gray-900 dark:text-gray-100">
        {children ??
          (value === null || value === undefined || value === "" ? "—" : value)}
      </dd>
    </div>
  );
}

export default function ActivityLogDetailDrawer({
  activity,
  onClose,
}: ActivityLogDetailDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [copied, setCopied] = useState(false);

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!activity) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [activity, close]);

  useEffect(() => setCopied(false), [activity?.id]);

  if (!activity) return null;

  const copyRequestId = async () => {
    try {
      await navigator.clipboard.writeText(activity.requestId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70]"
      aria-labelledby="activity-detail-title"
    >
      <button
        type="button"
        aria-label="Close activity details"
        onClick={close}
        className="absolute inset-0 h-full w-full cursor-default bg-slate-950/55 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-describedby="activity-detail-summary"
        className="absolute top-0 right-0 flex h-full w-full max-w-xl flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      >
        <header className="border-b border-gray-200 px-4 py-4 sm:px-5 dark:border-gray-700">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    activity.outcome === "SUCCESS"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200"
                      : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-200"
                  }`}
                >
                  {activity.outcome === "SUCCESS" ? "Successful" : "Failed"}
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {STAFF_ACTIVITY_CATEGORY_LABELS[activity.category]}
                </span>
              </div>
              <h2
                id="activity-detail-title"
                className="text-lg font-bold text-gray-900 dark:text-white"
              >
                {activity.actionLabel}
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formatStaffActivityTimestamp(activity.createdAt)}
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Close activity details"
              onClick={close}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-900 focus:ring-2 focus:ring-blue-500/30 focus:outline-none dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-5">
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
              <UserRound className="h-4 w-4" /> Staff member
            </h3>
            <dl className="grid gap-2 sm:grid-cols-2">
              <DetailField label="Name" value={activity.actorName} />
              <DetailField
                label="Role"
                value={STAFF_ACTIVITY_ROLE_LABELS[activity.actorRole]}
              />
              <DetailField
                label="Phone hint"
                value={maskedPhoneHint(activity.actorPhoneSuffix)}
              />
              <DetailField label="Actor ID" value={activity.actorId} />
            </dl>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
              <ShieldCheck className="h-4 w-4" /> Request
            </h3>
            <div className="space-y-2">
              <div className="rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-800/70">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                    Request ID
                  </dt>
                  <button
                    type="button"
                    onClick={copyRequestId}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 focus:ring-2 focus:ring-blue-500/30 focus:outline-none dark:text-blue-300 dark:hover:bg-blue-950/40"
                  >
                    {copied ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <dd className="mt-1 font-mono text-xs break-all text-gray-900 dark:text-gray-100">
                  {activity.requestId}
                </dd>
              </div>
              <dl className="grid gap-2 sm:grid-cols-2">
                <DetailField
                  label="Response"
                  value={`${activity.statusCode} · ${formatActivityDuration(activity.durationMs)}`}
                />
                <DetailField label="App source" value={activity.appType} />
                <div className="sm:col-span-2">
                  <DetailField
                    label="Route"
                    value={`${activity.httpMethod} ${activity.requestPath}`}
                  />
                </div>
                <DetailField label="Action code" value={activity.actionType} />
                <DetailField label="Brand ID" value={activity.brandId} />
              </dl>
            </div>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
              <Building2 className="h-4 w-4" /> Context
            </h3>
            <dl className="grid gap-2 sm:grid-cols-2">
              <DetailField label="Property">
                {activity.propertyId ? (
                  <Link
                    href={`/admin/properties/${activity.propertyId}`}
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-300"
                  >
                    {activity.propertyName ||
                      activity.propertyCode ||
                      activity.propertyId}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  "—"
                )}
              </DetailField>
              <DetailField
                label="Property code"
                value={activity.propertyCode}
              />
              <DetailField label="Entity type" value={activity.entityType} />
              <DetailField label="Entity ID" value={activity.entityId} />
            </dl>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
              <Clipboard className="h-4 w-4" /> Summary
            </h3>
            <p
              id="activity-detail-summary"
              className="rounded-lg bg-gray-50 px-3 py-3 text-sm leading-6 text-gray-700 dark:bg-gray-800/70 dark:text-gray-200"
            >
              {activity.summary ||
                "No additional summary was recorded for this event."}
            </p>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
              <MonitorSmartphone className="h-4 w-4" /> Client details
            </h3>
            <dl className="grid gap-2">
              <DetailField label="IP address" value={activity.ipAddress} />
              <DetailField label="User agent" value={activity.userAgent} />
            </dl>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
              <FileJson2 className="h-4 w-4" /> Safe metadata
            </h3>
            {activity.metadata && Object.keys(activity.metadata).length ? (
              <pre className="max-h-80 overflow-auto rounded-lg border border-gray-200 bg-slate-950 p-3 font-mono text-xs leading-5 break-all whitespace-pre-wrap text-slate-100 dark:border-gray-700">
                {JSON.stringify(activity.metadata, null, 2)}
              </pre>
            ) : (
              <p className="rounded-lg bg-gray-50 px-3 py-4 text-sm text-gray-500 dark:bg-gray-800/70 dark:text-gray-400">
                No safe metadata was recorded.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
