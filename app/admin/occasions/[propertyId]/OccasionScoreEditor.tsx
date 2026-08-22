"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import toast from "react-hot-toast";
import { savePropertyOccasionScores, type OccasionScore } from "@/actions/occasionActions";

interface Props {
  propertyId: string;
  initialScores: OccasionScore[];
}

export default function OccasionScoreEditor({ propertyId, initialScores }: Props) {
  const [scores, setScores] = useState<OccasionScore[]>(initialScores);
  const [saving, startSave] = useTransition();
  const router = useRouter();

  const handleChange = (occasionId: string, raw: string) => {
    const num = Math.min(100, Math.max(0, Number(raw) || 0));
    setScores((prev) =>
      prev.map((s) => (s.occasionId === occasionId ? { ...s, score: num } : s))
    );
  };

  const handleSave = () => {
    startSave(async () => {
      const toastId = "occasion-save";
      toast.loading("Saving…", { id: toastId, duration: Infinity });

      const result = await savePropertyOccasionScores(
        propertyId,
        scores.map(({ occasionId, score }) => ({ occasionId, score }))
      );

      toast.dismiss(toastId);
      if (result.success) {
        setScores(result.data);
        toast.success("Scores saved.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20, marginTop: 0 }}>
        Enter a score from 0–100 for each occasion. Scores above 0 appear in recommendations.
      </p>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {scores.map((row, i) => (
          <div
            key={row.occasionId}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 0",
              borderTop: i === 0 ? "1px solid rgba(15,23,42,0.09)" : "1px solid rgba(15,23,42,0.09)",
              gap: 16,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: "#172033" }}>{row.name}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <input
                type="number"
                min={0}
                max={100}
                value={row.score}
                onChange={(e) => handleChange(row.occasionId, e.target.value)}
                style={{
                  width: 72,
                  height: 36,
                  borderRadius: 8,
                  border: "1px solid #d3dce8",
                  background: "#ffffff",
                  textAlign: "center",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#172033",
                  outline: "none",
                }}
              />
              <span style={{ fontSize: 12, color: "#94a3b8", width: 36 }}>/ 100</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            height: 40,
            padding: "0 20px",
            borderRadius: 9,
            background: "#2f6df6",
            color: "#fff",
            border: "none",
            fontSize: 14,
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
            boxShadow: "0 10px 22px -12px rgba(47,109,246,0.9)",
          }}
        >
          <Save size={16} />
          {saving ? "Saving…" : "Save Scores"}
        </button>
      </div>
    </div>
  );
}
