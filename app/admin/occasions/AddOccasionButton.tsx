"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { createOccasion } from "@/actions/occasionActions";
import styles from "@/app/admin/components/AdminListPage.module.css";

export default function AddOccasionButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const reset = () => { setName(""); setIcon(""); };

  const handleClose = () => { reset(); setOpen(false); };

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Name is required."); return; }
    startTransition(async () => {
      const result = await createOccasion(name.trim(), icon.trim() || null);
      if (result.success) {
        toast.success(`"${name.trim()}" added.`);
        handleClose();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className={styles.createButton}>
        + Add Occasion
      </button>

      {open && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 14, padding: 28, width: 420, maxWidth: "calc(100vw - 32px)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#eef2f8" }}>Add Occasion</h3>
              <button onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                  Name *
                </label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="e.g. Anniversary Stay"
                  style={{
                    width: "100%", boxSizing: "border-box", height: 40, padding: "0 12px",
                    borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)",
                    background: "#283242", color: "#eef2f8", fontSize: 14, outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                  Icon <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
                </label>
                <input
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="e.g. sparkles"
                  style={{
                    width: "100%", boxSizing: "border-box", height: 40, padding: "0 12px",
                    borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)",
                    background: "#283242", color: "#eef2f8", fontSize: 14, outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
              <button
                onClick={handleClose}
                style={{
                  height: 38, padding: "0 18px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent", color: "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={pending}
                style={{
                  height: 38, padding: "0 18px", borderRadius: 8, border: "none",
                  background: "#2f6df6", color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.7 : 1,
                  boxShadow: "0 8px 20px -10px rgba(47,109,246,0.9)",
                }}
              >
                {pending ? "Creating…" : "Create Occasion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
