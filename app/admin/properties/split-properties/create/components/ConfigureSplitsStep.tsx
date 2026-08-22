"use client";

import { usePropertyTypeLookup } from "@/hooks/properties/usePropertyTypeLookup";
import { useEffect } from "react";

export type ChildConfig = {
  name: string;
  code: string;
  type: string;
  codeName: string;
  slug: string;
};

interface ConfigureSplitsStepProps {
  source: { propertyName?: string; propertyCode?: string } | null;
  children: ChildConfig[];
  onAddChild: () => void;
  onRemoveChild: (i: number) => void;
  onEditChild: (i: number, field: keyof ChildConfig, val: string) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-semibold text-[#9aa6b4]">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-[#243044] bg-[#0a111c] px-3 py-2 text-[13.5px] text-[#e7edf4] placeholder-[#4a5568] outline-none transition focus:border-blue-500";
const monoInputCls = inputCls + " font-mono text-[12.5px]";
const selectCls = inputCls + " cursor-pointer appearance-none";

export default function ConfigureSplitsStep({
  source,
  children,
  onAddChild,
  onRemoveChild,
  onEditChild,
}: ConfigureSplitsStepProps) {
  const { propertyTypes, propertyTypesLoading, ensurePropertyTypesLoaded } = usePropertyTypeLookup();

  useEffect(() => {
    void ensurePropertyTypesLoaded();
  }, [ensurePropertyTypesLoaded]);

  return (
    <div className="rounded-xl border border-[#1b2433] bg-[#0d1420] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h6 className="text-base font-bold text-white">Configure the splits</h6>
          <p className="mt-1.5 text-[13px] text-[#8b97a6]">
            Define two or more child properties with their identity details.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddChild}
          disabled={children.length >= 4}
          className="rounded-xl border border-[#243044] bg-[#101826] px-4 py-2.5 text-[13.5px] font-semibold text-[#cdd6e0] transition hover:border-[#33445e] hover:bg-[#0f1825] disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Add split
        </button>
      </div>

      {source && (
        <div className="mt-5 flex flex-wrap items-center gap-2.5 rounded-xl border border-blue-500/25 bg-blue-600/10 px-4 py-3">
          <span className="text-[13px] text-[#cdd6e0]">Splitting</span>
          <span className="text-[13px] font-bold text-white">{source.propertyName}</span>
          <span className="rounded-md border border-[#243044] bg-[#101826] px-2 py-0.5 text-[11px] text-[#6f7c8c]">
            {source.propertyCode}
          </span>
          <span className="ml-auto text-[12.5px] font-semibold text-blue-400">
            {children.length} {children.length === 1 ? "child" : "children"}
          </span>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-4">
        {children.map((c, i) => (
          <div
            key={i}
            className="rounded-xl border border-[#1b2433] bg-[#0a111c] p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-lg text-[12px] font-bold text-white"
                  style={{ background: "linear-gradient(180deg,#3f7bff,#2f6fed)" }}
                >
                  {i + 1}
                </div>
                <span className="text-[13.5px] font-semibold text-[#dbe6ff]">Split {i + 1}</span>
              </div>
              {children.length > 2 && (
                <button
                  type="button"
                  onClick={() => onRemoveChild(i)}
                  className="text-[12.5px] font-semibold text-[#e0698a] transition hover:text-red-400"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Property name">
                <input
                  value={c.name}
                  onChange={(e) => onEditChild(i, "name", e.target.value)}
                  placeholder="e.g. East Wing"
                  className={inputCls}
                />
              </Field>
              <Field label="Property code">
                <input
                  value={c.code}
                  onChange={(e) => onEditChild(i, "code", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Property type">
                <select
                  value={c.type}
                  onChange={(e) => onEditChild(i, "type", e.target.value)}
                  disabled={propertyTypesLoading}
                  className={selectCls}
                >
                  <option value="">
                    {propertyTypesLoading ? "Loading…" : "Select type"}
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
              <Field label="Property code name">
                <input
                  value={c.codeName}
                  onChange={(e) => onEditChild(i, "codeName", e.target.value)}
                  placeholder="e.g. 2BR Pool Farmhouse in Moinabad"
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="mt-3">
              <Field label="Property slug">
                <input
                  value={c.slug}
                  onChange={(e) => onEditChild(i, "slug", e.target.value)}
                  className={monoInputCls}
                />
              </Field>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
