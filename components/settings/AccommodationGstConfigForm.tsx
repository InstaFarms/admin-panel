"use client";

import { useState, useTransition } from "react";
import { Alert, Button, Label, Select, TextInput } from "flowbite-react";
import {
  addAccommodationGstConfigRow,
  fetchAccommodationGstConfig,
  type AccommodationGstConfigRow,
  type AccommodationGstPolicy,
} from "@/actions/taxConfigurationActions";

interface AccommodationGstConfigFormProps {
  brands: { id: string; name: string }[];
  initialGlobalPolicy: AccommodationGstPolicy | null;
  initialGlobalHistory: AccommodationGstConfigRow[];
}

const KEY_LABELS: Record<string, string> = {
  ACCOMMODATION_GST_SLAB_BOUNDARY: "Boundary (₹/night)",
  ACCOMMODATION_GST_RATE_LOWER: "Lower rate (%)",
  ACCOMMODATION_GST_RATE_HIGHER: "Higher rate (%)",
};

export default function AccommodationGstConfigForm({
  brands,
  initialGlobalPolicy,
  initialGlobalHistory,
}: AccommodationGstConfigFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [scopeBrandId, setScopeBrandId] = useState<string>("");
  const [policy, setPolicy] = useState<AccommodationGstPolicy | null>(initialGlobalPolicy);
  const [history, setHistory] = useState<AccommodationGstConfigRow[]>(initialGlobalHistory);

  const [key, setKey] = useState<"BOUNDARY" | "LOWER" | "HIGHER">("HIGHER");
  const [value, setValue] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [description, setDescription] = useState("");

  const reloadScope = (brandId: string) => {
    startTransition(async () => {
      const result = await fetchAccommodationGstConfig(brandId || null);
      if (result.success) {
        setPolicy(result.policy);
        setHistory(result.history);
      } else {
        setMessage({ type: "error", text: result.error });
      }
    });
  };

  const handleScopeChange = (brandId: string) => {
    setScopeBrandId(brandId);
    reloadScope(brandId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      setMessage({ type: "error", text: "Value must be a non-negative number" });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
      setMessage({ type: "error", text: "Effective-from date is required (YYYY-MM-DD)" });
      return;
    }

    startTransition(async () => {
      const result = await addAccommodationGstConfigRow({
        key,
        brandId: scopeBrandId || null,
        value: numericValue,
        effectiveFrom,
        description: description.trim() || null,
      });
      if (result.success) {
        setMessage({ type: "success", text: "Configuration row added." });
        setValue("");
        setEffectiveFrom("");
        setDescription("");
        reloadScope(scopeBrandId);
      } else {
        setMessage({ type: "error", text: result.error });
      }
      setTimeout(() => setMessage(null), 5000);
    });
  };

  return (
    <div className="space-y-6">
      {message && (
        <Alert color={message.type === "success" ? "success" : "failure"}>
          {message.text}
        </Alert>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
        <Label htmlFor="scopeBrandId" className="mb-2 block">
          Scope
        </Label>
        <div className="max-w-xs">
          <Select
            id="scopeBrandId"
            value={scopeBrandId}
            onChange={(e) => handleScopeChange(e.target.value)}
          >
            <option value="">Global default (applies to every brand)</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} override
              </option>
            ))}
          </Select>
        </div>

        {policy && (
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-slate-500 dark:text-slate-400">Boundary</div>
              <div className="font-bold">₹{policy.boundary}</div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Lower rate</div>
              <div className="font-bold">{policy.lower}%</div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Higher rate</div>
              <div className="font-bold">{policy.higher}%</div>
            </div>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          {scopeBrandId
            ? "This is the effective value for the selected brand — a brand override wins over the global default if one is set here; otherwise the global default applies."
            : "This is the global default used by every brand that has no override of its own."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
        <div className="mb-1 text-sm font-bold text-slate-900 dark:text-white">
          Add a new effective-dated row
        </div>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Append-only — this never edits or removes an existing row. Use a
          future date so past bookings keep using the rate that was actually
          in force when they were made.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="gstConfigKey" className="mb-2 block">
              Field
            </Label>
            <Select id="gstConfigKey" value={key} onChange={(e) => setKey(e.target.value as typeof key)}>
              <option value="BOUNDARY">{KEY_LABELS.ACCOMMODATION_GST_SLAB_BOUNDARY}</option>
              <option value="LOWER">{KEY_LABELS.ACCOMMODATION_GST_RATE_LOWER}</option>
              <option value="HIGHER">{KEY_LABELS.ACCOMMODATION_GST_RATE_HIGHER}</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="gstConfigValue" className="mb-2 block">
              Value
            </Label>
            <TextInput
              id="gstConfigValue"
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="gstConfigEffectiveFrom" className="mb-2 block">
              Effective from
            </Label>
            <TextInput
              id="gstConfigEffectiveFrom"
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="gstConfigDescription" className="mb-2 block">
              Note (optional)
            </Label>
            <TextInput
              id="gstConfigDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Budget 2027 rate change"
            />
          </div>
        </div>
        <div className="mt-4">
          <Button type="submit" disabled={isPending} className="px-6">
            {isPending ? "Saving..." : "Add row"}
          </Button>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="border-b border-slate-200 p-4 text-sm font-bold text-slate-900 dark:border-slate-700 dark:text-white">
          History
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2">Field</th>
                <th className="px-4 py-2">Scope</th>
                <th className="px-4 py-2">Value</th>
                <th className="px-4 py-2">Effective from</th>
                <th className="px-4 py-2">Effective to</th>
                <th className="px-4 py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-slate-400">
                    No rows yet
                  </td>
                </tr>
              ) : (
                history.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-2">{KEY_LABELS[row.key] || row.key}</td>
                    <td className="px-4 py-2">{row.brandId ? "Brand override" : "Global"}</td>
                    <td className="px-4 py-2">{row.value}</td>
                    <td className="px-4 py-2">{row.effectiveFrom}</td>
                    <td className="px-4 py-2">{row.effectiveTo || "—"}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{row.description || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
