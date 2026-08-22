"use client";

import { useState } from "react";
import Link from "next/link";
import type { CityCount } from "@/actions/occasionActions";

interface Props {
  cities: CityCount[];
  selectedCity: string | null;
  occasionSlug: string | null;
}

function cityHref(cityName: string | null, occasionSlug: string | null) {
  const params = new URLSearchParams();
  if (occasionSlug) params.set("occasion", occasionSlug);
  if (cityName)     params.set("city", cityName);
  const q = params.toString();
  return q ? `/admin/occasions?${q}` : "/admin/occasions";
}

export default function CitiesPanel({ cities, selectedCity, occasionSlug }: Props) {
  const [citySearch, setCitySearch] = useState("");

  const filtered = citySearch.trim()
    ? cities.filter((c) => c.cityName.toLowerCase().includes(citySearch.toLowerCase()))
    : cities;

  const totalCount = cities.reduce((s, c) => s + c.count, 0);

  const rowStyle = (active: boolean): React.CSSProperties => ({
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "9px 14px", textDecoration: "none", fontSize: 13,
    fontWeight: active ? 700 : 500,
    background: active ? "rgba(47,109,246,0.08)" : "transparent",
    color: active ? "#2f6df6" : "var(--ink-2, #334155)",
    borderLeft: active ? "3px solid #2f6df6" : "3px solid transparent",
    cursor: "pointer",
  });

  return (
    <div style={{
      width: 210, flexShrink: 0,
      background: "var(--panel, #fff)",
      border: "1px solid var(--line, rgba(15,23,42,0.09))",
      borderRadius: 14,
      boxShadow: "var(--shadow)",
      overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line, rgba(15,23,42,0.09))" }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.8px", textTransform: "uppercase", color: "var(--muted, #64748b)" }}>
          Cities
        </span>
      </div>

      {/* City search */}
      <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--line, rgba(15,23,42,0.09))" }}>
        <input
          value={citySearch}
          onChange={(e) => setCitySearch(e.target.value)}
          placeholder="Search city…"
          style={{
            width: "100%", boxSizing: "border-box", height: 32,
            padding: "0 10px", borderRadius: 7, fontSize: 12,
            border: "1px solid var(--field-border, #d3dce8)",
            background: "var(--field, #fff)", color: "var(--ink, #172033)",
            outline: "none",
          }}
        />
      </div>

      {/* All Cities */}
      <Link href={cityHref(null, occasionSlug)} style={rowStyle(!selectedCity)}>
        <span>All Cities</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--dim, #94a3b8)" }}>{totalCount}</span>
      </Link>

      {/* City list */}
      <div style={{ overflowY: "auto", maxHeight: 420 }}>
        {filtered.map((c) => (
          <Link key={c.cityName} href={cityHref(c.cityName, occasionSlug)} style={rowStyle(selectedCity === c.cityName)}>
            <span>{c.cityName}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--dim, #94a3b8)" }}>{c.count}</span>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p style={{ padding: "10px 14px", fontSize: 12, color: "var(--dim, #94a3b8)", margin: 0 }}>
            No cities match.
          </p>
        )}
      </div>
    </div>
  );
}
