"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { OccasionMeta } from "@/actions/occasionActions";

// Show this many tabs before collapsing to "More"
const VISIBLE = 6;

interface Props {
  occasions: OccasionMeta[];
  selected: string | null;
  city: string | null;
  search?: string;
}

function tabHref(slug: string | null, city: string | null, search?: string) {
  const params = new URLSearchParams();
  if (slug)   params.set("occasion", slug);
  if (city)   params.set("city", city);
  if (search) params.set("search", search);
  const q = params.toString();
  return q ? `/admin/occasions?${q}` : "/admin/occasions";
}

function Chip({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex", alignItems: "center", height: 36, padding: "0 16px",
        borderRadius: 999, fontSize: 13, fontWeight: 700, textDecoration: "none",
        whiteSpace: "nowrap", flexShrink: 0,
        background:   active ? "#2f6df6" : "transparent",
        color:        active ? "#fff"    : "#64748b",
        border:       "1px solid",
        borderColor:  active ? "#2f6df6" : "rgba(15,23,42,0.14)",
        boxShadow:    active ? "0 10px 22px -12px rgba(47,109,246,0.9)" : "none",
      }}
    >
      {label}
    </Link>
  );
}

export default function OccasionTabs({ occasions, selected, city, search }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [occSearch, setOccSearch] = useState("");
  const moreRef = useRef<HTMLDivElement>(null);

  // Filter occasions by the search term (client-side)
  const filtered = occSearch.trim()
    ? occasions.filter((o) => o.name.toLowerCase().includes(occSearch.toLowerCase()))
    : occasions;

  const visible  = filtered.slice(0, VISIBLE);
  const overflow = filtered.slice(VISIBLE);
  const overflowActive = overflow.some((o) => o.slug === selected);
  const activeOverflow = overflow.find((o) => o.slug === selected);

  // Close on outside click
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moreOpen]);

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Occasion name search */}
      <div style={{ marginBottom: 10 }}>
        <input
          value={occSearch}
          onChange={(e) => setOccSearch(e.target.value)}
          placeholder="Search occasion…"
          style={{
            height: 36, padding: "0 14px", borderRadius: 8, fontSize: 13,
            border: "1px solid rgba(15,23,42,0.14)",
            background: "var(--field, #fff)", color: "var(--ink, #172033)",
            outline: "none", width: 220,
          }}
        />
      </div>

      {/* Tabs row — scrollable part + More button outside it */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Scrollable chips */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", flex: 1, paddingBottom: 4 }}>
          {!occSearch && (
            <Chip label="All Occasions" active={!selected} href={tabHref(null, city, search)} />
          )}
          {visible.map((o) => (
            <Chip key={o.slug} label={o.name} active={selected === o.slug} href={tabHref(o.slug, city, search)} />
          ))}
        </div>

        {/* More button — outside the scrollable div so dropdown isn't clipped */}
        {overflow.length > 0 && (
          <div ref={moreRef} style={{ flexShrink: 0, position: "relative", zIndex: 40 }}>
            <button
              onClick={() => setMoreOpen((v) => !v)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                height: 36, padding: "0 14px", borderRadius: 999, fontSize: 13,
                fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer",
                background:  overflowActive ? "#2f6df6" : "transparent",
                color:       overflowActive ? "#fff"    : "#64748b",
                border:      "1px solid",
                borderColor: overflowActive ? "#2f6df6" : "rgba(15,23,42,0.14)",
                boxShadow:   overflowActive ? "0 10px 22px -12px rgba(47,109,246,0.9)" : "none",
              }}
            >
              {overflowActive ? (activeOverflow?.name ?? "More") : "More"}
              <ChevronDown
                size={13}
                style={{ transform: moreOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
              />
            </button>

            {moreOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0,
                background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10, padding: "6px 0", minWidth: 200,
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 999,
              }}>
                {overflow.map((o) => (
                  <Link
                    key={o.slug}
                    href={tabHref(o.slug, city, search)}
                    onClick={() => setMoreOpen(false)}
                    style={{
                      display: "block", padding: "9px 16px", fontSize: 13,
                      fontWeight: selected === o.slug ? 700 : 500,
                      color: selected === o.slug ? "#4f8bff" : "#94a3b8",
                      textDecoration: "none",
                      background: selected === o.slug ? "rgba(47,109,246,0.1)" : "transparent",
                    }}
                  >
                    {o.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
