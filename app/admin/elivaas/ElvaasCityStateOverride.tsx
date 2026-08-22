"use client";

import { useState, useTransition } from "react";
import { updateElvaasCityState } from "@/actions/elivaasActions";

const INDIAN_STATES = [
  // States
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  // Union Territories
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

interface Props {
  citySlug: string;
  cityName: string;
  currentState: string | null;
  isUnknown: boolean;
}

export default function ElvaasCityStateOverride({ citySlug, cityName, currentState, isUnknown }: Props) {
  const [editing, setEditing]  = useState(false);
  const [value,   setValue]    = useState(currentState ?? "");
  const [saved,   setSaved]    = useState(false);
  const [saving,  startSaving] = useTransition();

  function handleSave(val?: string) {
    const toSave = (val ?? value).trim() || null;
    startSaving(async () => {
      const r = await updateElvaasCityState(citySlug, cityName, toSave);
      if (r.success) {
        setSaved(true);
        setEditing(false);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  if (!editing) {
    return (
      <span className="flex items-center gap-1.5">
        {isUnknown && !currentState ? (
          <span className="text-[11px] text-orange-500 font-medium">⚠️ State unknown</span>
        ) : (
          <span className="text-[11px] text-gray-400">{currentState ?? "—"}</span>
        )}
        {saved && <span className="text-[11px] text-emerald-500">✓ saved</span>}
        <button
          onClick={() => setEditing(true)}
          className="text-[10px] text-blue-500 hover:text-blue-700 underline underline-offset-2 ml-0.5"
        >
          {currentState ? "edit" : "set state"}
        </button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <select
        autoFocus
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (e.target.value) handleSave(e.target.value);
        }}
        className="h-6 rounded border border-gray-300 px-1 text-xs text-gray-800 focus:border-emerald-500 focus:outline-none bg-white max-w-[160px]"
      >
        <option value="">— select state —</option>
        <optgroup label="States">
          {INDIAN_STATES.slice(0, 28).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </optgroup>
        <optgroup label="Union Territories">
          {INDIAN_STATES.slice(28).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </optgroup>
      </select>
      {saving && <span className="text-[10px] text-gray-400">saving…</span>}
      <button
        onClick={() => setEditing(false)}
        className="text-[10px] text-gray-400 hover:text-gray-600"
      >
        ✕
      </button>
    </span>
  );
}
