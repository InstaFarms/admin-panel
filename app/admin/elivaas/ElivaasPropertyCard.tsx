"use client";

import { useState } from "react";
import { Badge, Card } from "flowbite-react";
import ElivaasPropertySettingsRow from "./ElivaasPropertySettingsRow";
import type { ElivaasPropertySettings } from "@/actions/elivaasActions";

interface CatalogData {
  description:          string | null;
  maxOccupancy:         number | null;
  lat:                  string | null;
  lng:                  string | null;
  firstImageUrl:        string | null;
  imageCount:           number | null;
  amenityCount:         number | null;
  faqsJson?:            string | null;
  imagesJson?:          string | null;
  amenitiesJson?:       string | null;
  houseRulesJson?:      string | null;
  metricsJson?:         string | null;
  extraAdultRate?:      number | null;
  extraChildRate?:      number | null;
  securityFee?:         number | null;
}

interface Props {
  propertyId:    string;
  displayName:   string;
  city:          string;
  isHidden:      boolean;
  lastSyncedAt:  string;
  catalogData:   CatalogData;
  initialSettings: Omit<ElivaasPropertySettings, "propertyId" | "createdAt" | "updatedAt">;
  checkinDate?:  string;
  checkoutDate?: string;
  adults?:       number;
  children?:     number;
}

function formatRelative(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ElivaasPropertyCard({
  propertyId,
  displayName,
  city,
  isHidden,
  lastSyncedAt,
  catalogData,
  initialSettings,
  checkinDate,
  checkoutDate,
  adults,
  children,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="w-full bg-white dark:bg-gray-800">
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-base font-semibold text-gray-900 dark:text-white truncate">
            {displayName}
          </span>
          <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
            {city}
          </span>
          {isHidden && <Badge color="warning" className="shrink-0">Hidden</Badge>}
          <p className="text-xs text-gray-400 shrink-0">
            ID: {propertyId} · synced {formatRelative(lastSyncedAt)}
          </p>
        </div>
        <span className="shrink-0 text-gray-400 text-lg leading-none">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {/* Expanded settings */}
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
          <ElivaasPropertySettingsRow
            propertyId={propertyId}
            propertyName={displayName}
            catalogData={catalogData}
            initialSettings={initialSettings}
            checkinDate={checkinDate}
            checkoutDate={checkoutDate}
            adults={adults}
            children={children}
          />
        </div>
      )}
    </Card>
  );
}
