"use client";

import MyButton from "@/components/MyButton";
import DeleteTagButton from "../../DeleteTagButton";
import { Tag } from "@/utils/types";
import { Label, TextInput } from "flowbite-react";
import { useTagEditorForm } from "@/hooks/useTagEditorForm";
import type { BrandAdminScope } from "@/constants/brandAdminScope";
import { Check, Palette, Sparkles, SwatchBook, Tag as TagIcon } from "lucide-react";

interface TagEditorProps {
  data?: Tag;
  brandScope?: BrandAdminScope;
}

const COLOR_PRESETS = [
  "#2563eb",
  "#0f766e",
  "#16a34a",
  "#ca8a04",
  "#ea580c",
  "#dc2626",
  "#db2777",
  "#7c3aed",
  "#475569",
];

function FieldBlock({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
      <div className="flex items-start gap-3">
        <span className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {icon}
        </span>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function TagEditor({ data, brandScope = "instafarms" }: TagEditorProps) {
  const { name, setName, color, setColor, loading, handleSubmit } = useTagEditorForm(data, { brandScope });
  const normalizedColor = color || "#2563eb";
  const readinessItems = [
    { label: "Name added", ready: name.trim().length > 0 },
    { label: "Color selected", ready: normalizedColor.trim().length > 0 },
  ];
  const readyCount = readinessItems.filter((item) => item.ready).length;

  return (
    <form action={handleSubmit} className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-xl dark:border-slate-700">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900">
                Content tag
              </span>
              <span className="rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-medium text-cyan-100">
                {data ? "Editing existing tag" : "Create new tag"}
              </span>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">{name.trim() || "Untitled Tag"}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Shape a reusable label with a clear name and a color that stays easy to recognize across tables and filters.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Fields</p>
              <p className="mt-2 text-2xl font-semibold">{readyCount}/2</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Color</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: normalizedColor }} />
                <span className="text-sm font-semibold">{normalizedColor}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Preview</p>
              <div className="mt-2">
                <span
                  className="inline-flex rounded-full px-3 py-1 text-sm font-semibold"
                  style={{
                    backgroundColor: `${normalizedColor}22`,
                    color: normalizedColor,
                    border: `1px solid ${normalizedColor}55`,
                  }}
                >
                  {name.trim() || "Sample Tag"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_320px]">
        <div className="space-y-6">
          <FieldBlock
            title="Tag identity"
            description="Use a short name that stays readable anywhere the label appears."
            icon={<TagIcon size={18} />}
          >
            <div>
              <Label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Name
              </Label>
              <TextInput
                id="name"
                name="name"
                type="text"
                placeholder="Featured, Trending, Weekend, Family..."
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                theme={{
                  field: {
                    input: {
                      base: "block w-full border disabled:cursor-not-allowed disabled:opacity-50",
                      colors: {
                        gray: "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-500",
                      },
                    },
                  },
                }}
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Keep it compact so it works well in chips, filters, and table rows.
              </p>
            </div>
          </FieldBlock>

          <FieldBlock
            title="Color system"
            description="Pick a color that is distinctive without overpowering the rest of the admin UI."
            icon={<Palette size={18} />}
          >
            <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="space-y-3">
                <Label htmlFor="color" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Pick color
                </Label>
                <input
                  id="color"
                  name="color"
                  type="color"
                  className="h-28 w-full cursor-pointer rounded-2xl border border-slate-300 bg-white p-2 dark:border-slate-600 dark:bg-slate-800"
                  value={normalizedColor}
                  onChange={(e) => setColor(e.target.value)}
                />
                <TextInput
                  value={normalizedColor}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#2563eb"
                  theme={{
                    field: {
                      input: {
                        base: "block w-full border disabled:cursor-not-allowed disabled:opacity-50",
                        colors: {
                          gray: "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-500",
                        },
                      },
                    },
                  }}
                />
              </div>

              <div className="space-y-5">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <SwatchBook size={16} className="text-slate-500 dark:text-slate-400" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Quick presets</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {COLOR_PRESETS.map((preset) => {
                      const active = normalizedColor.toLowerCase() === preset.toLowerCase();

                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setColor(preset)}
                          className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                            active
                              ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                              : "border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                          }`}
                        >
                          <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: preset }} />
                          {preset}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-500" />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Live chip preview</p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <span
                      className="inline-flex rounded-full px-4 py-2 text-sm font-semibold"
                      style={{
                        backgroundColor: `${normalizedColor}22`,
                        color: normalizedColor,
                        border: `1px solid ${normalizedColor}55`,
                      }}
                    >
                      {name.trim() || "Sample Tag"}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      This is how the tag tone will read in the admin interface.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </FieldBlock>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Publishing</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Save when the label and color feel easy to scan at a glance.
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                {readyCount}/{readinessItems.length} ready
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {data ? "Updating existing tag" : "Creating new tag"}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Short names and balanced colors usually work best across filters and content listings.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              <MyButton type="submit" loading={loading}>
                {data ? "Save Tag" : "Create Tag"}
              </MyButton>
              {data?.id && <DeleteTagButton id={data.id} brandScope={brandScope} fullWidth showLabel />}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/15 p-2 text-emerald-600 dark:text-emerald-300">
                <Check size={16} />
              </span>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Readiness checklist</h3>
            </div>
            <div className="mt-4 space-y-3">
              {readinessItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700"
                >
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      item.ready
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {item.ready ? "Ready" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </form>
  );
}
