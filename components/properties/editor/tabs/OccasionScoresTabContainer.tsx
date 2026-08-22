"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { RotateCcw, Save, Search, SlidersHorizontal } from "lucide-react";
import { Spinner } from "flowbite-react";
import toast from "react-hot-toast";
import { JarvisLoader } from "@/components/JarvisLogo";
import {
  getPropertyOccasionScores,
  savePropertyOccasionScores,
  type OccasionScore,
} from "@/actions/occasionActions";

type SortMode = "score-desc" | "score-asc" | "alpha";

// ── Colour tokens (matches the admin dark theme) ─────────────────────────────
const C = {
  text:    "#eef2f8",
  muted:   "#64748b",
  dim:     "#475569",
  panel:   "#1e293b",
  input:   "#283242",
  border:  "rgba(255,255,255,0.08)",
  borderM: "rgba(255,255,255,0.12)",
  blue:    "#2f6df6",
  blueSoft:"rgba(47,109,246,0.12)",
} as const;

function ScoreInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: string) => void;
}) {
  const color =
    value >= 70 ? "#34d399" : value >= 40 ? "#fbbf24" : value > 0 ? "#94a3b8" : "#475569";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 66, height: 36, textAlign: "center",
          borderRadius: 8,
          border: `1px solid ${value > 0 ? "rgba(255,255,255,0.18)" : C.border}`,
          background: C.input, color, fontSize: 15,
          fontWeight: 700, outline: "none",
        }}
      />
      <span style={{ fontSize: 12, color: C.dim, whiteSpace: "nowrap" }}>/ 100</span>
    </div>
  );
}

export default function OccasionScoresTabContainer({
  propertyId,
}: {
  propertyId?: string | null;
}) {
  const [scores, setScores]         = useState<OccasionScore[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, startSave]         = useTransition();
  const [search, setSearch]         = useState("");
  const [sort, setSort]             = useState<SortMode>("score-desc");
  const [onlyScored, setOnlyScored] = useState(false);

  const load = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    try {
      const data = await getPropertyOccasionScores(propertyId);
      // Default sort by weight on first load
      setScores([...data].sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0)));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to load occasion scores.");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => { void load(); }, [load]);

  const handleChange = (id: string, raw: string) => {
    const num = Math.min(100, Math.max(0, Number(raw) || 0));
    setScores((p) => p.map((s) => (s.occasionId === id ? { ...s, score: num } : s)));
  };

  const handleReset = () => {
    setScores((p) => p.map((s) => ({ ...s, score: 0 })));
    toast.success("All scores reset to 0.");
  };

  const handleSave = () => {
    if (!propertyId) return;
    startSave(async () => {
      const id = "occ-save";
      toast.loading("Saving…", { id, duration: Infinity });
      const result = await savePropertyOccasionScores(
        propertyId,
        scores.map(({ occasionId, score }) => ({ occasionId, score })),
      );
      toast.dismiss(id);
      if (result.success) {
        setScores(result.data);
        toast.success("Occasion scores saved.");
      } else {
        toast.error(result.error);
      }
    });
  };

  const displayed = useMemo(() => {
    let list = [...scores];
    if (search.trim()) list = list.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
    if (onlyScored)    list = list.filter((s) => s.score > 0);
    switch (sort) {
      case "score-desc": list.sort((a, b) => b.score - a.score); break;
      case "score-asc":  list.sort((a, b) => a.score - b.score); break;
      case "alpha":      list.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    return list;
  }, [scores, search, sort, onlyScored]);

  // ── Guards ────────────────────────────────────────────────────────────────

  if (!propertyId) {
    return (
      <p style={{ textAlign: "center", padding: 32, color: C.muted, fontSize: 14 }}>
        Save the property first to manage occasion scores.
      </p>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <JarvisLoader size="lg" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "20px 24px", maxWidth: 680, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 18 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text }}>Occasion Scores</h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted }}>
            Set how important each occasion is. Higher scores mean stronger recommendations.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              height: 34, padding: "0 14px", borderRadius: 8,
              border: `1px solid ${C.borderM}`, background: "transparent",
              color: "#94a3b8", fontSize: 12, fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
            }}
          >
            <RotateCcw size={12} /> Reset to Default
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              height: 34, padding: "0 16px", borderRadius: 8,
              border: "none", background: C.blue, color: "#fff",
              fontSize: 12, fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
              boxShadow: "0 8px 20px -10px rgba(47,109,246,0.9)",
            }}
          >
            {saving ? <Spinner size="sm" light /> : <Save size={12} />}
            Save Scores
          </button>
        </div>
      </div>

      {/* ── Info banner ── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "11px 14px", borderRadius: 9,
        border: "1px solid rgba(59,130,246,0.25)",
        background: "rgba(59,130,246,0.06)", marginBottom: 18, gap: 12,
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#93c5fd" }}>How scoring works</p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
            Enter a score between 0 and 100 for each occasion. Higher scores surface this
            property higher in that occasion&apos;s recommendations.
          </p>
        </div>
        <span style={{ flexShrink: 0, fontSize: 11, color: C.dim, fontWeight: 700, whiteSpace: "nowrap" }}>
          0 = Not recommended
        </span>
      </div>

      {/* ── Search + Sort ── */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={12} style={{
            position: "absolute", left: 10, top: "50%",
            transform: "translateY(-50%)", color: C.muted, pointerEvents: "none",
          }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search occasions…"
            style={{
              width: "100%", boxSizing: "border-box" as const,
              height: 34, paddingLeft: 30, paddingRight: 10,
              borderRadius: 8, border: `1px solid ${C.border}`,
              background: C.input, color: C.text, fontSize: 13, outline: "none",
            }}
          />
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          style={{
            height: 34, padding: "0 10px", borderRadius: 8,
            border: `1px solid ${C.border}`, background: C.input,
            color: C.text, fontSize: 12, fontWeight: 600, outline: "none", cursor: "pointer",
          }}
        >
          <option value="score-desc">Score: High → Low</option>
          <option value="score-asc">Score: Low → High</option>
          <option value="alpha">A → Z</option>
        </select>

        {/* Filter toggle */}
        <button
          type="button"
          onClick={() => setOnlyScored((v) => !v)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            height: 34, padding: "0 12px", borderRadius: 8,
            border: `1px solid ${onlyScored ? C.blue : C.border}`,
            background: onlyScored ? C.blueSoft : C.input,
            color: onlyScored ? "#4f8bff" : C.muted,
            fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const,
          }}
        >
          <SlidersHorizontal size={12} />
          {onlyScored ? "Scored only" : "All occasions"}
        </button>
      </div>

      {/* ── Table ── */}
      <div style={{
        border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden",
      }}>
        {/* Table header */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 140px",
          padding: "9px 16px",
          background: "rgba(255,255,255,0.03)",
          borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.8px", textTransform: "uppercase" as const, color: C.muted }}>
            Occasion
          </span>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.8px", textTransform: "uppercase" as const, color: C.muted, textAlign: "center" as const }}>
            Score
          </span>
        </div>

        {/* Rows */}
        {displayed.length === 0 ? (
          <div style={{ padding: "24px 16px", textAlign: "center" as const, color: C.muted, fontSize: 13 }}>
            {search ? `No occasions match "${search}".` : "No occasions to show."}
          </div>
        ) : (
          displayed.map((row, i) => (
            <div
              key={row.occasionId}
              style={{
                display: "grid", gridTemplateColumns: "1fr 140px",
                padding: "11px 16px", alignItems: "center",
                borderTop: i === 0 ? "none" : `1px solid ${C.border}`,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{row.name}</span>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <ScoreInput value={row.score} onChange={(v) => handleChange(row.occasionId, v)} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Subtle row count */}
      {displayed.length > 0 && (
        <p style={{ marginTop: 10, fontSize: 11, color: C.dim, textAlign: "right" as const }}>
          {displayed.length} of {scores.length} occasions
        </p>
      )}
    </div>
  );
}
