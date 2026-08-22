"use client";

import { useState } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Badge, Checkbox } from "flowbite-react";
import type { ElivaasPropertyDiff, FieldChange } from "@/actions/elivaasActions";
import { syncApplyElivaas } from "@/actions/elivaasActions";

interface Props {
  diff: ElivaasPropertyDiff;
  onClose: () => void;
  onDone: (result: { upserted: number; removed: number }) => void;
}

type NewEntry     = ElivaasPropertyDiff["newProperties"][number];
type NameChange   = ElivaasPropertyDiff["nameChanges"][number];
type RemovedEntry = ElivaasPropertyDiff["removedProperties"][number];

const PAGE_SIZE = 15;

const FIELD_LABELS: Record<string, string> = {
  name: "Name", description: "Description", imageCount: "Image Count",
  amenityCount: "Amenity Count", maxOccupancy: "Max Guests",
  lat: "Latitude", lng: "Longitude", firstImageUrl: "Cover Image URL",
  extraAdultRate: "Extra Adult Rate", extraChildRate: "Extra Child Rate",
  securityFee: "Security Fee", faqsJson: "FAQs",
};

// Fields that can be individually selected for new properties (name/city always imported)
const NEW_PROP_OPTIONAL_FIELDS = ["description", "maxOccupancy", "imageCount", "amenityCount", "lat", "lng", "firstImageUrl", "extraAdultRate", "extraChildRate", "securityFee", "faqsJson"] as const;

function Paginator({ total, page, onPage }: { total: number; page: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
      <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</span>
      <div className="flex gap-1">
        <button disabled={page === 0} onClick={() => onPage(page - 1)} className="px-2 py-0.5 rounded border disabled:opacity-40 hover:bg-gray-50">← Prev</button>
        <button disabled={page >= pages - 1} onClick={() => onPage(page + 1)} className="px-2 py-0.5 rounded border disabled:opacity-40 hover:bg-gray-50">Next →</button>
      </div>
    </div>
  );
}

/** Get the optional fields that actually have data for a new property */
function getAvailableOptionalFields(p: NewEntry): string[] {
  return NEW_PROP_OPTIONAL_FIELDS.filter(f => (p as any)[f] != null && (p as any)[f] !== "");
}

/** Format a field value for display */
function displayValue(field: string, p: NewEntry): string {
  const v = (p as any)[field];
  if (v == null) return "—";
  if (field === "description") return String(v).slice(0, 100) + (String(v).length > 100 ? "…" : "");
  if (field === "firstImageUrl") return String(v).slice(0, 60) + "…";
  return String(v);
}

export default function SyncPreviewModal({ diff, onClose, onDone }: Props) {
  // New properties — per-field selection (name/city always included, optionals selectable)
  const [newPropFields, setNewPropFields] = useState<Map<string, Set<string>>>(() => {
    const m = new Map<string, Set<string>>();
    for (const p of diff.newProperties) {
      m.set(p.propertyId, new Set(getAvailableOptionalFields(p)));
    }
    return m;
  });

  // Track which new properties are selected at all (property-level toggle)
  const [selectedNew, setSelectedNew] = useState<Set<string>>(
    new Set(diff.newProperties.map(p => p.propertyId))
  );

  // Updated properties — per-field selection
  const [selectedFields, setSelectedFields] = useState<Map<string, Set<string>>>(() => {
    const m = new Map<string, Set<string>>();
    for (const p of diff.nameChanges) {
      m.set(p.propertyId, new Set(p.fieldChanges.map(f => f.field)));
    }
    return m;
  });

  // Removed — none by default
  const [selectedRemove, setSelectedRemove] = useState<Set<string>>(new Set());

  const [pageNew, setPageNew]         = useState(0);
  const [pageChanges, setPageChanges] = useState(0);
  const [pageRemoved, setPageRemoved] = useState(0);
  const [applying, setApplying]       = useState(false);
  const [error, setError]             = useState("");

  // ── New property helpers ──
  function toggleNewProp(id: string) {
    const next = new Set(selectedNew);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedNew(next);
  }

  function toggleNewField(propertyId: string, field: string) {
    const m = new Map(newPropFields);
    const s = new Set(m.get(propertyId) ?? []);
    s.has(field) ? s.delete(field) : s.add(field);
    m.set(propertyId, s);
    setNewPropFields(m);
  }

  function toggleAllNewFields(p: NewEntry) {
    const m = new Map(newPropFields);
    const available = getAvailableOptionalFields(p);
    const current = m.get(p.propertyId) ?? new Set();
    const allSel = available.every(f => current.has(f));
    m.set(p.propertyId, allSel ? new Set() : new Set(available));
    setNewPropFields(m);
  }

  // ── Updated property helpers ──
  function toggleField(propertyId: string, field: string) {
    const m = new Map(selectedFields);
    const s = new Set(m.get(propertyId) ?? []);
    s.has(field) ? s.delete(field) : s.add(field);
    m.set(propertyId, s);
    setSelectedFields(m);
  }

  function toggleAllFields(p: NameChange) {
    const m = new Map(selectedFields);
    const current = m.get(p.propertyId) ?? new Set();
    const allSel = p.fieldChanges.every(f => current.has(f.field));
    m.set(p.propertyId, allSel ? new Set() : new Set(p.fieldChanges.map(f => f.field)));
    setSelectedFields(m);
  }

  function toggleRemove(id: string) {
    const next = new Set(selectedRemove);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedRemove(next);
  }

  // ── Apply ──
  async function handleApply() {
    setApplying(true);
    setError("");
    try {
      // New properties — import selected properties with their selected optional fields
      const newUpserts = diff.newProperties
        .filter(p => selectedNew.has(p.propertyId))
        .map(p => {
          const fields = newPropFields.get(p.propertyId) ?? new Set();
          const obj: Record<string, any> = {
            propertyId: p.propertyId,
            name: p.name,
            city: p.city,
            citySlug: (p as any).citySlug ?? "",
          };
          for (const f of NEW_PROP_OPTIONAL_FIELDS) {
            if (fields.has(f)) obj[f] = (p as any)[f] ?? null;
          }
          return obj;
        });

      // Updated properties — only selected fields
      const updateUpserts = diff.nameChanges
        .filter(p => (selectedFields.get(p.propertyId)?.size ?? 0) > 0)
        .map(p => {
          const fields = selectedFields.get(p.propertyId) ?? new Set();
          const obj: Record<string, any> = {
            propertyId: p.propertyId,
            city: p.city,
            citySlug: (p as any).citySlug ?? "",
          };
          for (const fc of p.fieldChanges) {
            if (fields.has(fc.field)) obj[fc.field] = fc.newValue;
          }
          return obj;
        });

      const result = await syncApplyElivaas({
        toUpsert: [...newUpserts, ...updateUpserts] as any,
        toRemove: [...selectedRemove],
      });

      if (!result.success) {
        setError(result.message ?? "Apply failed");
      } else {
        onDone({ upserted: result.upserted ?? 0, removed: result.removed ?? 0 });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setApplying(false);
    }
  }

  const totalChanges = diff.newProperties.length + diff.nameChanges.length + diff.removedProperties.length;
  const selectedCount =
    selectedNew.size +
    [...selectedFields.values()].filter(s => s.size > 0).length +
    selectedRemove.size;

  const pagedNew     = diff.newProperties.slice(pageNew * PAGE_SIZE, (pageNew + 1) * PAGE_SIZE);
  const pagedChanges = diff.nameChanges.slice(pageChanges * PAGE_SIZE, (pageChanges + 1) * PAGE_SIZE);
  const pagedRemoved = diff.removedProperties.slice(pageRemoved * PAGE_SIZE, (pageRemoved + 1) * PAGE_SIZE);

  return (
    <Modal show onClose={onClose} size="3xl">
      <ModalHeader>
        Elivaas Sync Preview
        {totalChanges === 0 && <span className="ml-2 text-sm font-normal text-gray-500">— no changes detected</span>}
      </ModalHeader>

      <ModalBody className="space-y-5 max-h-[65vh] overflow-y-auto">
        {totalChanges === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            Catalog is up to date. {diff.unchanged} properties unchanged.
          </p>
        ) : (
          <>
            <p className="text-xs text-gray-400">{diff.unchanged} unchanged · Select properties & fields to import.</p>

            {/* ── New Properties — per-field selection ── */}
            {diff.newProperties.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                    <Badge color="success">+{diff.newProperties.length}</Badge> New Properties
                  </h3>
                  <button
                    onClick={() => setSelectedNew(
                      selectedNew.size === diff.newProperties.length
                        ? new Set()
                        : new Set(diff.newProperties.map(p => p.propertyId))
                    )}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    {selectedNew.size === diff.newProperties.length ? "Deselect all" : "Select all"}
                  </button>
                </div>

                <div className="space-y-3">
                  {pagedNew.map((p: NewEntry) => {
                    const isSelected = selectedNew.has(p.propertyId);
                    const fields = newPropFields.get(p.propertyId) ?? new Set();
                    const available = getAvailableOptionalFields(p);
                    const allFieldsSel = available.every(f => fields.has(f));

                    return (
                      <div key={p.propertyId} className={`rounded-lg border transition-colors ${isSelected ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-gray-50 opacity-60"}`}>
                        {/* Property header with toggle */}
                        <div className="flex items-start gap-3 px-3 py-2">
                          <Checkbox
                            className="mt-0.5"
                            checked={isSelected}
                            onChange={() => toggleNewProp(p.propertyId)}
                          />
                          <div className="min-w-0 flex-1 flex gap-2">
                            {(p as any).firstImageUrl && (
                              <img src={(p as any).firstImageUrl} alt="" className="w-12 h-10 object-cover rounded flex-shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                              <p className="text-xs text-gray-500 capitalize">{p.city} · {p.propertyId}</p>
                            </div>
                          </div>
                          {isSelected && available.length > 0 && (
                            <button onClick={() => toggleAllNewFields(p)} className="text-[11px] text-emerald-600 hover:text-emerald-800 font-medium shrink-0">
                              {allFieldsSel ? "Deselect fields" : "Select fields"}
                            </button>
                          )}
                        </div>

                        {/* Always-imported fields */}
                        {isSelected && (
                          <div className="border-t border-emerald-100 px-3 pb-2 pt-2 space-y-1.5">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Always imported</p>
                            <div className="flex gap-2 flex-wrap">
                              <span className="text-[11px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">✓ Name: {p.name.slice(0, 40)}</span>
                              <span className="text-[11px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">✓ City: {p.city}</span>
                            </div>

                            {available.length > 0 && (
                              <>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-2 mb-1.5">Optional fields</p>
                                <div className="space-y-1">
                                  {available.map(field => (
                                    <label key={field} className={`flex items-start gap-2 rounded px-2 py-1.5 cursor-pointer transition-colors ${fields.has(field) ? "bg-emerald-100" : "bg-white border border-gray-100"}`}>
                                      <Checkbox
                                        className="mt-0.5"
                                        checked={fields.has(field)}
                                        onChange={() => toggleNewField(p.propertyId, field)}
                                      />
                                      <div className="min-w-0">
                                        <span className="text-xs font-semibold text-emerald-700">{FIELD_LABELS[field] ?? field}</span>
                                        <p className="text-[11px] text-gray-500 truncate">{displayValue(field, p)}</p>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <Paginator total={diff.newProperties.length} page={pageNew} onPage={setPageNew} />
              </section>
            )}

            {/* ── Updated Properties — per-field diff ── */}
            {diff.nameChanges.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                    <Badge color="info">~{diff.nameChanges.length}</Badge> Updated Properties
                  </h3>
                </div>
                <div className="space-y-3">
                  {pagedChanges.map((p: NameChange) => {
                    const fields = selectedFields.get(p.propertyId) ?? new Set();
                    const allSel = p.fieldChanges.every(f => fields.has(f.field));
                    return (
                      <div key={p.propertyId} className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{p.newName}</p>
                            <p className="text-xs text-gray-500 capitalize">{p.city} · {p.propertyId}</p>
                          </div>
                          <button onClick={() => toggleAllFields(p)} className="text-[11px] text-blue-600 hover:text-blue-800 font-medium shrink-0">
                            {allSel ? "Deselect all" : "Select all"}
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {p.fieldChanges.map((fc: FieldChange) => (
                            <label key={fc.field} className={`flex items-start gap-2.5 rounded px-2 py-1.5 cursor-pointer transition-colors ${fields.has(fc.field) ? "bg-blue-100" : "bg-white"}`}>
                              <Checkbox
                                className="mt-0.5"
                                checked={fields.has(fc.field)}
                                onChange={() => toggleField(p.propertyId, fc.field)}
                              />
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-semibold text-blue-700">{FIELD_LABELS[fc.field] ?? fc.field}</span>
                                <div className="text-[11px] text-gray-500 mt-0.5 space-y-0.5">
                                  {fc.displayOld && (
                                    <div className="flex gap-1">
                                      <span className="shrink-0 text-red-400 font-medium">Old:</span>
                                      <span className="line-through text-gray-400 truncate">{fc.displayOld}</span>
                                    </div>
                                  )}
                                  {fc.displayNew && (
                                    <div className="flex gap-1">
                                      <span className="shrink-0 text-emerald-600 font-medium">New:</span>
                                      <span className="text-gray-700 truncate">{fc.displayNew}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Paginator total={diff.nameChanges.length} page={pageChanges} onPage={setPageChanges} />
              </section>
            )}

            {/* ── Removed ── */}
            {diff.removedProperties.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                    <Badge color="failure">-{diff.removedProperties.length}</Badge> No Longer on Elivaas
                  </h3>
                  <button
                    onClick={() => setSelectedRemove(
                      selectedRemove.size === diff.removedProperties.length
                        ? new Set()
                        : new Set(diff.removedProperties.map(p => p.propertyId))
                    )}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    {selectedRemove.size === diff.removedProperties.length ? "Deselect all" : "Select all"}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-2">Select ones to remove from catalog.</p>
                <div className="space-y-1.5">
                  {pagedRemoved.map((p: RemovedEntry) => (
                    <label key={p.propertyId} className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 cursor-pointer hover:bg-red-100 transition-colors">
                      <Checkbox checked={selectedRemove.has(p.propertyId)} onChange={() => toggleRemove(p.propertyId)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{p.city} · {p.propertyId}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <Paginator total={diff.removedProperties.length} page={pageRemoved} onPage={setPageRemoved} />
              </section>
            )}
          </>
        )}

        {error && <p className="text-sm text-red-600 rounded-md bg-red-50 px-3 py-2">{error}</p>}
      </ModalBody>

      <ModalFooter className="flex justify-between items-center">
        <p className="text-xs text-gray-400">{selectedCount} selected</p>
        <div className="flex gap-2">
          <Button color="light" onClick={onClose} disabled={applying}>Cancel</Button>
          {totalChanges > 0 && (
            <Button color="dark" onClick={handleApply} disabled={applying || selectedCount === 0}>
              {applying ? "Applying…" : `Apply${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
            </Button>
          )}
          {totalChanges === 0 && <Button color="dark" onClick={onClose}>Done</Button>}
        </div>
      </ModalFooter>
    </Modal>
  );
}
