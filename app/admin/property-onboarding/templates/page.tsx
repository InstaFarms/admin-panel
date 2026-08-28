"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  Spinner,
  TextInput,
  Textarea,
} from "flowbite-react";
import { HiOutlinePlus, HiPencil, HiTrash } from "react-icons/hi";
import toast from "react-hot-toast";
import {
  createOnboardingTemplate,
  deactivateOnboardingTemplate,
  getOnboardingMaster,
  getOnboardingTemplates,
  updateOnboardingTemplate,
} from "@/actions/propertyOnboardingActions";
import { getAuditMasterData } from "@/actions/auditMasterActions";

const empty = () => ({
  name: "",
  description: "",
  applicableApps: ["SUPERVISOR", "HOST"],
  isDefault: false,
  isActive: true,
  areas: [] as any[],
});
export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]),
    [areas, setAreas] = useState<any[]>([]),
    [items, setItems] = useState<any[]>([]),
    [draft, setDraft] = useState<any>(),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const [t, a, i]: any[] = await Promise.all([
      getOnboardingTemplates(),
      getOnboardingMaster("area-types"),
      getAuditMasterData("checklist-items", {
        perPage: 1000,
        orderBy: "name",
        sortorder: "asc",
      }),
    ]);
    if (t.success) setTemplates(t.data || []);
    if (a.success)
      setAreas(
        (a.data || []).map((x: any) => ({ ...x.config, areaName: x.areaName })),
      );
    if (i.success) setItems(i.data || []);
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const addArea = () => {
    const a = areas.find(
      (x) => !draft.areas.some((y: any) => y.areaConfigId === x.id),
    );
    if (!a)
      return toast.error("All configured area types are already included");
    setDraft({
      ...draft,
      areas: [
        ...draft.areas,
        {
          areaConfigId: a.id,
          areaName: a.areaName,
          displayOrder: draft.areas.length,
          isRequired: false,
          items: [],
        },
      ],
    });
  };
  const patchArea = (n: number, p: any) => {
    const next = [...draft.areas];
    next[n] = { ...next[n], ...p };
    setDraft({ ...draft, areas: next });
  };
  const addItem = (n: number, id: string) => {
    if (!id) return;
    const area = draft.areas[n];
    if (area.items.some((x: any) => x.checklistItemMasterId === id))
      return toast.error("Item already added");
    const master = items.find((x) => x.id === id);
    patchArea(n, {
      items: [
        ...area.items,
        {
          checklistItemMasterId: id,
          itemName: master?.name,
          questionLabel: null,
          captureMode: master?.itemType === "MAINTENANCE" ? "CHECK" : "ASSET",
          minQuantity: master?.itemType === "MAINTENANCE" ? 1 : 0,
          maxQuantity: master?.itemType === "MAINTENANCE" ? 1 : null,
          conditionRequired: true,
          minPhotos: 1,
          maxPhotos: null,
          remarksRule: "OPTIONAL",
          displayOrder: area.items.length,
          isActive: true,
        },
      ],
    });
  };
  const save = async () => {
    if (
      !draft.name.trim() ||
      !draft.areas.length ||
      draft.areas.some((a: any) => !a.items.length)
    )
      return toast.error(
        "Name, at least one area, and an item in every area are required",
      );
    if (!draft.applicableApps.length)
      return toast.error("Select at least one app");
    setSaving(true);
    const payload = { ...draft };
    delete payload.id;
    const r: any = draft.id
      ? await updateOnboardingTemplate(draft.id, payload)
      : await createOnboardingTemplate(payload);
    setSaving(false);
    if (!r.success) return toast.error(r.message || "Save failed");
    toast.success("Onboarding template saved");
    setDraft(undefined);
    await load();
  };
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Onboarding Templates</h1>
          <p className="text-sm text-gray-500">
            Configure the guided quantity, condition, photo, and remark rules
            for each standardized area.
          </p>
        </div>
        <Button onClick={() => setDraft(empty())}>
          <HiOutlinePlus className="mr-2 h-4 w-4" />
          New template
        </Button>
      </div>
      {loading ? (
        <Spinner />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <div className="flex justify-between">
                <div>
                  <div className="flex gap-2">
                    <h2 className="font-semibold">{t.name}</h2>
                    {t.isDefault && <Badge color="success">Default</Badge>}
                    {!t.isActive && <Badge color="gray">Inactive</Badge>}
                  </div>
                  <p className="text-sm text-gray-500">
                    {t.description || "No description"}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    {t.areas.length} areas ·{" "}
                    {t.areas.reduce(
                      (s: number, a: any) => s + a.items.length,
                      0,
                    )}{" "}
                    items · {t.applicableApps.join(", ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="xs"
                    color="light"
                    onClick={() => setDraft(structuredClone(t))}
                  >
                    <HiPencil />
                  </Button>
                  <Button
                    size="xs"
                    color="failure"
                    disabled={!t.isActive}
                    onClick={async () => {
                      const r: any = await deactivateOnboardingTemplate(t.id);
                      r.success
                        ? (toast.success("Template deactivated"), load())
                        : toast.error(r.message);
                    }}
                  >
                    <HiTrash />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal
        show={Boolean(draft)}
        onClose={() => !saving && setDraft(undefined)}
        size="7xl"
      >
        <ModalHeader>
          {draft?.id ? "Edit" : "Create"} onboarding template
        </ModalHeader>
        <ModalBody>
          {draft && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Name">
                  <TextInput
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
                  />
                </Field>
                <Field label="Description">
                  <Textarea
                    value={draft.description || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, description: e.target.value })
                    }
                  />
                </Field>
                <Check
                  label="Supervisor"
                  checked={draft.applicableApps.includes("SUPERVISOR")}
                  set={(v) =>
                    setDraft({
                      ...draft,
                      applicableApps: toggle(
                        draft.applicableApps,
                        "SUPERVISOR",
                        v,
                      ),
                    })
                  }
                />
                <Check
                  label="Host"
                  checked={draft.applicableApps.includes("HOST")}
                  set={(v) =>
                    setDraft({
                      ...draft,
                      applicableApps: toggle(draft.applicableApps, "HOST", v),
                    })
                  }
                />
                <Check
                  label="Default template"
                  checked={draft.isDefault}
                  set={(v) => setDraft({ ...draft, isDefault: v })}
                />
                <Check
                  label="Active"
                  checked={draft.isActive}
                  set={(v) => setDraft({ ...draft, isActive: v })}
                />
              </div>
              <div className="flex justify-between">
                <h3 className="font-semibold">Areas and baseline items</h3>
                <Button size="sm" color="light" onClick={addArea}>
                  Add area
                </Button>
              </div>
              {draft.areas.map((a: any, n: number) => (
                <Card key={`${a.areaConfigId}-${n}`}>
                  <div className="grid gap-3 md:grid-cols-[1fr_120px_120px_auto]">
                    <Select
                      value={a.areaConfigId}
                      onChange={(e) => {
                        const selected = areas.find(
                          (x) => x.id === e.target.value,
                        );
                        patchArea(n, {
                          areaConfigId: e.target.value,
                          areaName: selected?.areaName,
                        });
                      }}
                    >
                      {areas.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.areaName}
                        </option>
                      ))}
                    </Select>
                    <TextInput
                      type="number"
                      value={a.displayOrder}
                      onChange={(e) =>
                        patchArea(n, { displayOrder: Number(e.target.value) })
                      }
                    />
                    <Check
                      label="Required"
                      checked={a.isRequired}
                      set={(v) => patchArea(n, { isRequired: v })}
                    />
                    <Button
                      color="failure"
                      size="xs"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          areas: draft.areas.filter(
                            (_: any, i: number) => i !== n,
                          ),
                        })
                      }
                    >
                      <HiTrash />
                    </Button>
                  </div>
                  <div className="mt-3">
                    <Select
                      value=""
                      onChange={(e) => addItem(n, e.target.value)}
                    >
                      <option value="">Add checklist item…</option>
                      {items.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="mt-3 space-y-2">
                    {a.items.map((it: any, j: number) => (
                      <div
                        key={`${it.checklistItemMasterId}-${j}`}
                        className="grid gap-2 rounded border p-3 md:grid-cols-[1.5fr_120px_repeat(5,100px)_140px_auto]"
                      >
                        <div className="text-sm font-medium">
                          {it.itemName ||
                            items.find((x) => x.id === it.checklistItemMasterId)
                              ?.name}
                        </div>
                        <Select
                          aria-label="Capture mode"
                          value={it.captureMode ?? "ASSET"}
                          onChange={(e) => {
                            const captureMode = e.target.value;
                            itemPatch(draft, setDraft, n, j, {
                              captureMode,
                              ...(captureMode === "CHECK"
                                ? { minQuantity: 1, maxQuantity: 1 }
                                : {}),
                            });
                          }}
                        >
                          <option value="ASSET">Asset</option>
                          <option value="CHECK">Operational check</option>
                        </Select>
                        <Num
                          label="Min qty"
                          value={it.minQuantity}
                          set={(v) =>
                            itemPatch(draft, setDraft, n, j, { minQuantity: v })
                          }
                        />
                        <Num
                          label="Max qty"
                          value={it.maxQuantity}
                          nullable
                          set={(v) =>
                            itemPatch(draft, setDraft, n, j, { maxQuantity: v })
                          }
                        />
                        <Num
                          label="Min photos"
                          value={it.minPhotos}
                          set={(v) =>
                            itemPatch(draft, setDraft, n, j, { minPhotos: v })
                          }
                        />
                        <Num
                          label="Max photos"
                          value={it.maxPhotos}
                          nullable
                          set={(v) =>
                            itemPatch(draft, setDraft, n, j, { maxPhotos: v })
                          }
                        />
                        <Check
                          label="Condition"
                          checked={it.conditionRequired}
                          set={(v) =>
                            itemPatch(draft, setDraft, n, j, {
                              conditionRequired: v,
                            })
                          }
                        />
                        <Select
                          value={it.remarksRule}
                          onChange={(e) =>
                            itemPatch(draft, setDraft, n, j, {
                              remarksRule: e.target.value,
                            })
                          }
                        >
                          <option value="OPTIONAL">Remarks optional</option>
                          <option value="ALWAYS_REQUIRED">
                            Always required
                          </option>
                          <option value="REQUIRED_FOR_EXCEPTION">
                            Required for exceptions/damage
                          </option>
                        </Select>
                        <Button
                          size="xs"
                          color="failure"
                          onClick={() =>
                            patchArea(n, {
                              items: a.items.filter(
                                (_: any, i: number) => i !== j,
                              ),
                            })
                          }
                        >
                          <HiTrash />
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save template"}
          </Button>
          <Button color="gray" onClick={() => setDraft(undefined)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1 block">{label}</Label>
      {children}
    </div>
  );
}
function Check({
  label,
  checked,
  set,
}: {
  label: string;
  checked: boolean;
  set: (v: boolean) => void;
}) {
  return (
    <Label className="flex items-center gap-2">
      <Checkbox checked={checked} onChange={(e) => set(e.target.checked)} />
      {label}
    </Label>
  );
}
function Num({
  label,
  value,
  set,
  nullable,
}: {
  label: string;
  value: number | null;
  set: (v: number | null) => void;
  nullable?: boolean;
}) {
  return (
    <Field label={label}>
      <TextInput
        type="number"
        min={0}
        value={value ?? ""}
        onChange={(e) =>
          set(e.target.value === "" && nullable ? null : Number(e.target.value))
        }
      />
    </Field>
  );
}
function toggle(a: string[], x: string, v: boolean) {
  return v ? [...new Set([...a, x])] : a.filter((y) => y !== x);
}
function itemPatch(
  d: any,
  set: (x: any) => void,
  a: number,
  i: number,
  p: any,
) {
  const areas = [...d.areas],
    items = [...areas[a].items];
  items[i] = { ...items[i], ...p };
  areas[a] = { ...areas[a], items };
  set({ ...d, areas });
}
