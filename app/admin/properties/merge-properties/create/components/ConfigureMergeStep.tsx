"use client";

import { usePropertyTypeLookup } from "@/hooks/properties/usePropertyTypeLookup";
import { useEffect } from "react";

export type MergeConfig = {
  name: string;
  code: string;
  type: string;
  codeName: string;
  slug: string;
};

interface ConfigureMergeStepProps {
  constituents: { propertyName?: string; propertyCode?: string }[];
  primaryProperty: { propertyName?: string; propertyCode?: string } | null;
  config: MergeConfig;
  onEdit: (field: keyof MergeConfig, val: string) => void;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-semibold text-[#9aa6b4]">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-[#243044] bg-[#0a111c] px-3 py-2 text-[13.5px] text-[#e7edf4] placeholder-[#4a5568] outline-none transition focus:border-blue-500";
const monoInputCls = inputCls + " font-mono text-[12.5px]";
const selectCls = inputCls + " cursor-pointer appearance-none";

export default function ConfigureMergeStep({
  constituents,
  primaryProperty,
  config,
  onEdit,
}: ConfigureMergeStepProps) {
  const { propertyTypes, propertyTypesLoading, ensurePropertyTypesLoaded } = usePropertyTypeLookup();

  useEffect(() => {
    void ensurePropertyTypesLoaded();
  }, [ensurePropertyTypesLoaded]);

  return (
    <div className="rounded-xl border border-[#1b2433] bg-[#0d1420] p-6">
      <div>
        <h6 className="text-base font-bold text-white">Configure the merged property</h6>
        <p className="mt-1.5 text-[13px] text-[#8b97a6]">
          Pre-filled from the primary property — update the code to something unique for this merged property.
        </p>
      </div>

      {/* Constituents banner */}
      <div className="mt-5 flex flex-wrap items-center gap-2.5 rounded-xl border border-blue-500/25 bg-blue-600/10 px-4 py-3">
        <span className="text-[13px] text-[#cdd6e0]">Merging</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {constituents.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-md border border-[#243044] bg-[#101826] px-2 py-0.5 text-[11px] text-[#cdd6e0]">
              {c.propertyName || "—"}
              {c.propertyCode && <span className="text-[#4a5568]">({c.propertyCode})</span>}
            </span>
          ))}
        </div>
        {primaryProperty && (
          <span className="ml-auto text-[12.5px] font-semibold text-blue-400">
            Primary: {primaryProperty.propertyName}
          </span>
        )}
      </div>

      {/* Form */}
      <div className="mt-5 rounded-xl border border-[#1b2433] bg-[#0a111c] p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Property name" required>
            <input
              value={config.name}
              onChange={(e) => onEdit("name", e.target.value)}
              placeholder="e.g. Sunset Villa Merged"
              className={inputCls}
            />
          </Field>
          <Field label="Property code" required>
            <input
              value={config.code}
              onChange={(e) => onEdit("code", e.target.value.toUpperCase())}
              placeholder="e.g. SSVMERGE001-M"
              className={monoInputCls}
            />
          </Field>
          <Field label="Property type">
            <select
              value={config.type}
              onChange={(e) => onEdit("type", e.target.value)}
              disabled={propertyTypesLoading}
              className={selectCls}
            >
              <option value="">
                {propertyTypesLoading ? "Loading…" : "Select type (optional)"}
              </option>
              {propertyTypes.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-3">
          <Field label="Code name">
            <input
              value={config.codeName}
              onChange={(e) => onEdit("codeName", e.target.value)}
              placeholder="e.g. 4BR Farmhouse in Moinabad"
              className={inputCls}
            />
          </Field>
        </div>

        <div className="mt-3">
          <Field label="Slug">
            <input
              value={config.slug}
              onChange={(e) => onEdit("slug", e.target.value)}
              placeholder="e.g. sunset-villa-merged"
              className={monoInputCls}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
