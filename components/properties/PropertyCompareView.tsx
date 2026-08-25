"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "flowbite-react";
import { HiExternalLink } from "react-icons/hi";
import { resolveImageSrc } from "@/utils/image";
import { invertRequiresConfirmation } from "@/lib/propertyUtils";

function field(value: unknown, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  const v = String(value).trim();
  return v.length ? v : fallback;
}

function statusLabel(isLive: boolean) {
  return isLive ? "Live" : "Disabled";
}

function toArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function pickText(obj: any, keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

function coverUrl(item: any): string {
  const raw = pickText(item, [
    "photoUrl",
    "watermarkedUrlByInstafarms",
    "gridUrl",
    "thumbnailUrl",
    "originalUrl",
    "rawUrl",
    "listingUrl",
  ]);
  return resolveImageSrc(raw) ?? "";
}

function CollapsibleText({
  label,
  value,
  maxChars = 320,
}: {
  label: string;
  value: unknown;
  maxChars?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const text = value == null ? "" : String(value);
  const trimmed = text.trim();
  const tooLong = trimmed.length > maxChars;
  const shown = !tooLong || expanded ? trimmed : `${trimmed.slice(0, maxChars)}…`;

  return (
    <div>
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 dark:text-white">
        {trimmed ? (
          <div className="space-y-2">
            <div className="whitespace-pre-wrap break-words">{shown}</div>
            {tooLong ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            ) : null}
          </div>
        ) : (
          "—"
        )}
      </dd>
    </div>
  );
}

export function PropertyDetailsColumn({
  label,
  propertyId,
  preview,
  full,
}: {
  label: "Parent" | "Child";
  propertyId: string | null;
  preview: any | null;
  full: any | null;
}) {
  const p = (full?.property ?? full) || preview || {};
  const title = p?.propertyName || p?.name || p?.heading || "—";
  const isLive = !(Boolean(p?.isDisabled) || Boolean(p?.is_disabled));
  const parts = [p?.area, p?.city, p?.state].filter((x) => x != null && String(x).trim() !== "");
  const location = parts.length ? parts.join(", ") : "N/A";
  const boolLabel = (v: any) => (v === true ? "Yes" : v === false ? "No" : "—");

  const dayKeys: Array<{ k: string; label: string }> = [
    { k: "monday", label: "Mon" },
    { k: "tuesday", label: "Tue" },
    { k: "wednesday", label: "Wed" },
    { k: "thursday", label: "Thu" },
    { k: "friday", label: "Fri" },
    { k: "saturday", label: "Sat" },
    { k: "sunday", label: "Sun" },
  ];

  return (
    <div className="w-full min-w-0 space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
            <div className="mt-1 truncate text-base font-semibold text-gray-900 dark:text-white">{title}</div>
            <div className="mt-1 inline-flex items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  isLive
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
                }`}
              >
                {statusLabel(isLive)}
              </span>
              {propertyId ? (
                <Link
                  href={`/admin/properties/${propertyId}`}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                  target="_blank"
                >
                  Open <HiExternalLink className="h-3 w-3" />
                </Link>
              ) : null}
            </div>
          </div>
          <div className="text-right text-xs text-gray-500 dark:text-gray-400">Location: {location}</div>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Basics</div>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Property Type</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
              {field(pickText(p, ["propertyTypeName", "propertyType", "type", "propertyTypeId"]))}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Property Code Name</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{field(p?.propertyCodeName)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Property Code</dt>
            <dd className="mt-0.5 font-mono text-sm text-gray-900 dark:text-white">{field(p?.propertyCode)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Derivative Type</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{field(p?.propertyDerivativeType)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Location</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{location}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Address</div>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Address</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{field(p?.address)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Landmark</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{field(p?.landmark)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Pincode</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{field(p?.pincode)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Lat / Lng</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
              {field(
                [p?.latitude, p?.longitude].filter((x) => x != null && String(x).trim() !== "").join(", ") || "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Map Link</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white break-words">
              {p?.mapLink ? (
                <a
                  href={String(p.mapLink)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  Open map
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Google Place</div>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Google Place ID</dt>
            <dd className="mt-0.5 font-mono text-sm text-gray-900 dark:text-white">{field(p?.googlePlaceId)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Rating</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{field(p?.googlePlaceRating)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">User Rating Count</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
              {field(p?.googlePlaceUserRatingCount)}
            </dd>
          </div>
        </dl>

        <div className="mt-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">Reviews</div>
          {(() => {
            const reviews = toArray(p?.googlePlaceReviews);
            if (reviews.length === 0) {
              return <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">—</div>;
            }
            const list = reviews.slice(0, 5);
            return (
              <div className="mt-2 space-y-2">
                <div className="text-[11px] text-gray-500 dark:text-gray-400">Total: {reviews.length}</div>
                <div className="max-h-64 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-950">
                  <div className="space-y-2">
                    {list.map((r: any, idx: number) => (
                      <div
                        key={`${r?.time ?? idx}-${idx}`}
                        className="rounded-md bg-white px-2 py-1 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-200"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium">
                            {field(pickText(r, ["author_name", "author", "name"]))}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">
                            rating: {field(r?.rating)} · {field(r?.relative_time_description)}
                          </div>
                        </div>
                        {pickText(r, ["text"]) ? (
                          <div className="mt-1 whitespace-pre-wrap break-words text-[11px] text-gray-600 dark:text-gray-300 line-clamp-3">
                            {pickText(r, ["text"])}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
                {reviews.length > list.length ? (
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">Showing first {list.length}.</div>
                ) : null}
              </div>
            );
          })()}
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Capacity & Pricing</div>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Bedrooms / Bathrooms</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
              {field(
                [
                  p?.bedroomCount != null ? `bed: ${p.bedroomCount}` : null,
                  p?.bathroomCount != null ? `bath: ${p.bathroomCount}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Guests</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
              {field(
                [
                  p?.baseGuestCount != null ? `base: ${p.baseGuestCount}` : null,
                  p?.maxGuestCount != null ? `max: ${p.maxGuestCount}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Commission %</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{field(p?.commissionPercentage)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Security Deposit</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{field(p?.securityDeposit)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Cooking Access Fee</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{field(p?.cookingAccessFee)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Check-in / Check-out</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
              {field(
                [
                  p?.checkinTime ? `in: ${p.checkinTime}` : null,
                  p?.checkoutTime ? `out: ${p.checkoutTime}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Online Booking</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{boolLabel(p?.allowOnlineBooking)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Call Booking</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{boolLabel(p?.allowCallBooking)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Enquiry</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{boolLabel(p?.allowEnquiry)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Instant Booking</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
              {boolLabel(invertRequiresConfirmation(p?.requiresConfirmation))}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Day-wise Prices (summary)</div>
        <div className="mt-3 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-950">
          <div className="grid min-w-[520px] grid-cols-7 gap-2">
            {dayKeys.map((d) => {
              const price = (p as any)?.[`${d.k}Price`];
              const baseGuests = (p as any)?.[`${d.k}BaseGuestCount`];
              const discount = (p as any)?.[`${d.k}Discount`];
              return (
                <div key={d.k} className="rounded-md bg-white p-2 text-xs dark:bg-gray-900">
                  <div className="font-medium text-gray-700 dark:text-gray-200">{d.label}</div>
                  <div className="mt-1 text-gray-900 dark:text-white">price: {field(price)}</div>
                  <div className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                    base: {field(baseGuests)} · disc: {field(discount)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          Note: This shows key fields only (price/base/discount) per day.
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Cover Images</div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Only cover images are loaded here.</div>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {(() => {
            const enriched = toArray(full?.coverPhotos);
            const rawSnapshot = toArray((full?.property ?? full)?.coverPhotos);
            const source = enriched.length ? enriched : rawSnapshot;
            return source.slice(0, 5);
          })().map((cp: any, idx: number) => {
            const src = coverUrl(cp);
            return (
              <div
                key={cp?.id || `${idx}`}
                className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950"
                title={pickText(cp, ["name", "caption", "fileName", "id"]) || `Cover ${idx + 1}`}
              >
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt={pickText(cp, ["altText", "caption", "name"]) || `Cover ${idx + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">Empty</div>
                )}
                <div className="absolute left-1 top-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white">
                  {idx + 1}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Amenities & Activities</div>
        <dl className="mt-3 grid grid-cols-1 gap-3">
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Amenities</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {(() => {
                const list = toArray(full?.amenities);
                if (list.length === 0) return "—";
                const names = list.map((a: any) => pickText(a, ["name", "amenity", "title", "id"])).filter(Boolean);
                return names.length ? names.join(", ") : `(${list.length})`;
              })()}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Activities</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {(() => {
                const list = toArray(full?.activities);
                if (list.length === 0) return "—";
                const names = list.map((a: any) => pickText(a, ["name", "activity", "title", "id"])).filter(Boolean);
                return names.length ? names.join(", ") : `(${list.length})`;
              })()}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Plans</div>
        <dl className="mt-3 grid grid-cols-1 gap-3">
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Discount Plans</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {(() => {
                const list = toArray(full?.discountPlans);
                if (list.length === 0) return "—";
                const names = list.map((pl: any) => pickText(pl, ["name", "title", "id"])).filter(Boolean);
                return names.length ? names.join(", ") : `(${list.length})`;
              })()}
            </dd>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Short-term Cancellation</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {field(pickText(full?.shortTermCancellationPlan || full?.shortTermCancellation, ["name", "title", "id"]))}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Long-term Cancellation</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {field(pickText(full?.longTermCancellationPlan || full?.longTermCancellation, ["name", "title", "id"]))}
              </dd>
            </div>
          </div>
        </dl>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Gallery (no images)</div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Gallery images are not loaded here. This is a text-only summary.
        </div>
        {(() => {
          const gallery = toArray(full?.gallery);
          if (gallery.length === 0) {
            return <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">No gallery items.</div>;
          }

          const byKey = new Map<string, number>();
          for (const item of gallery) {
            const key = pickText(item, ["key", "tag"]) || "unknown";
            byKey.set(key, (byKey.get(key) || 0) + 1);
          }
          const groups = Array.from(byKey.entries()).sort((a, b) => b[1] - a[1]);

          const list = gallery
            .slice()
            .sort((a: any, b: any) => Number(a?.sortOrder ?? 999999) - Number(b?.sortOrder ?? 999999))
            .slice(0, 50);

          return (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-gray-800 dark:text-gray-200">
                  Total: {gallery.length}
                </span>
                {groups.map(([k, c]) => (
                  <span
                    key={k}
                    className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-gray-800 dark:text-gray-200"
                  >
                    {k}: {c}
                  </span>
                ))}
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-950">
                <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  First 50 items (sorted by sortOrder)
                </div>
                <div className="max-h-64 space-y-1 overflow-auto pr-1">
                  {list.map((g: any, idx: number) => (
                    <div
                      key={g?.id || `${idx}`}
                      className="flex items-start justify-between gap-3 rounded-md px-2 py-1 text-xs text-gray-700 hover:bg-white dark:text-gray-200 dark:hover:bg-gray-900"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{field(pickText(g, ["name", "caption", "fileName", "id"]))}</div>
                        <div className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                          key: {field(pickText(g, ["key", "tag"]))} · sort: {field(g?.sortOrder ?? g?.order)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </Card>

      <Card>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Special Dates</div>
        {(() => {
          const dates = toArray(full?.specialDates);
          if (dates.length === 0) {
            return <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">No special dates.</div>;
          }
          const sorted = dates
            .slice()
            .sort((a: any, b: any) => String(a?.date ?? "").localeCompare(String(b?.date ?? "")))
            .slice(0, 60);
          return (
            <div className="mt-3 space-y-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">Total: {dates.length}</div>
              <div className="max-h-64 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-950">
                <div className="space-y-1">
                  {sorted.map((d: any, idx: number) => (
                    <div
                      key={d?.id || `${idx}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1 text-xs text-gray-700 hover:bg-white dark:text-gray-200 dark:hover:bg-gray-900"
                    >
                      <div className="font-medium">{field(d?.date)}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        price: {field(d?.price)} · baseGuests: {field(d?.baseGuestCount)} · discount: {field(d?.discount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {dates.length > sorted.length ? (
                <div className="text-xs text-gray-500 dark:text-gray-400">Showing first {sorted.length}.</div>
              ) : null}
            </div>
          );
        })()}
      </Card>

      <Card>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Spaces</div>
        {(() => {
          const spaces = toArray(full?.spaceProperties || full?.spaces);
          if (spaces.length === 0) {
            return <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">No spaces.</div>;
          }
          const list = spaces.slice(0, 60);
          return (
            <div className="mt-3 space-y-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">Total: {spaces.length}</div>
              <div className="max-h-64 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-950">
                <div className="space-y-1">
                  {list.map((s: any, idx: number) => (
                    <div
                      key={s?.id || s?.spaceId || `${idx}`}
                      className="rounded-md px-2 py-1 text-xs text-gray-700 hover:bg-white dark:text-gray-200 dark:hover:bg-gray-900"
                    >
                      <div className="font-medium">{field(pickText(s, ["spaceName", "name", "title"]))}</div>
                      {pickText(s, ["description"]) ? (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">
                          {pickText(s, ["description"])}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
              {spaces.length > list.length ? (
                <div className="text-xs text-gray-500 dark:text-gray-400">Showing first {list.length}.</div>
              ) : null}
            </div>
          );
        })()}
      </Card>

      <Card>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Safety & Hygiene</div>
        {(() => {
          const list = toArray(full?.safetyHygiene);
          if (list.length === 0) {
            return <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">—</div>;
          }
          const names = list.map((x: any) => pickText(x, ["name", "title", "safetyHygieneId", "id"])).filter(Boolean);
          return <div className="mt-3 text-sm text-gray-900 dark:text-white">{names.length ? names.join(", ") : `(${list.length})`}</div>;
        })()}
      </Card>

      <Card>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Users</div>
        <dl className="mt-3 grid grid-cols-1 gap-3">
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Owners</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {(() => {
                const list = toArray(full?.owners);
                if (list.length === 0) return "—";
                return list
                  .map((u: any) => {
                    const name = [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim();
                    return name || pickText(u, ["name", "fullName", "email", "mobileNumber", "phone", "id"]);
                  })
                  .filter(Boolean)
                  .join(", ");
              })()}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Managers</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {(() => {
                const list = toArray(full?.managers);
                if (list.length === 0) return "—";
                return list
                  .map((u: any) => {
                    const name = [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim();
                    return name || pickText(u, ["name", "fullName", "email", "mobileNumber", "phone", "id"]);
                  })
                  .filter(Boolean)
                  .join(", ");
              })()}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Caretakers</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {(() => {
                const list = toArray(full?.caretakers);
                if (list.length === 0) return "—";
                return list
                  .map((u: any) => {
                    const name = [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim();
                    return name || pickText(u, ["name", "fullName", "email", "mobileNumber", "phone", "id"]);
                  })
                  .filter(Boolean)
                  .join(", ");
              })()}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Integrations</div>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-xs text-gray-500 dark:text-gray-400">iCal Links</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {(() => {
                const list = toArray((full?.property ?? full)?.icalLinks);
                if (list.length === 0) return "—";
                return list.map((l: any) => pickText(l, ["name", "icalUrl", "url", "id"])).filter(Boolean).join(", ");
              })()}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Content</div>
        <dl className="mt-3 grid grid-cols-1 gap-4">
          <CollapsibleText label="Description" value={(full?.property ?? full)?.description ?? full?.descriptionText} />
          <CollapsibleText label="Booking Policy" value={(full?.property ?? full)?.bookingPolicy} />
          <CollapsibleText
            label="Home Rules & Truths"
            value={(() => {
              const pp = (full?.property ?? full) as any;
              if (pp?.homeRulesTruths && typeof pp.homeRulesTruths === "object" && pp.homeRulesTruths !== null) {
                return (pp.homeRulesTruths as any).content ?? "";
              }
              return full?.homeRulesText ?? "";
            })()}
          />
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">FAQs</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {(() => {
                const list = toArray((full?.property ?? full)?.faqs);
                if (list.length === 0) return "—";
                return `Total: ${list.length}`;
              })()}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Meta</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {(() => {
                const meta = (full?.property ?? full)?.meta;
                if (!meta || typeof meta !== "object") return "—";
                const title = (meta as any).metaTitle ?? (meta as any).title ?? "";
                const url = (meta as any).metaUrl ?? (meta as any).url ?? "";
                return [title ? `title: ${title}` : null, url ? `url: ${url}` : null].filter(Boolean).join(" · ") || "—";
              })()}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}

export default function PropertyCompareView({
  parent,
  child,
}: {
  parent: { propertyId: string | null; preview: any | null; full: any | null };
  child: { propertyId: string | null; preview: any | null; full: any | null };
}) {
  const parentId = parent.propertyId || null;
  const childId = child.propertyId || null;

  const parentFull = useMemo(() => parent.full ?? null, [parent.full]);
  const childFull = useMemo(() => child.full ?? null, [child.full]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <PropertyDetailsColumn label="Parent" propertyId={parentId} preview={parent.preview} full={parentFull} />
      <PropertyDetailsColumn label="Child" propertyId={childId} preview={child.preview} full={childFull} />
    </div>
  );
}

