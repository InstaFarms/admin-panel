"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  TextInput,
  Textarea,
  ToggleSwitch,
} from "flowbite-react";
import { HiOutlinePlus, HiPencil } from "react-icons/hi";
import toast from "react-hot-toast";
import {
  createOnboardingMaster,
  getOnboardingMaster,
  updateOnboardingMaster,
  type OnboardingMasterKind,
} from "@/actions/propertyOnboardingActions";
import { getAuditMasterData } from "@/actions/auditMasterActions";

const defaults: Record<OnboardingMasterKind, any> = {
  levels: {
    name: "",
    family: "CUSTOM",
    sortOrder: 0,
    canBePrimaryEntrance: true,
    isDefaultEntrance: false,
    isActive: true,
  },
  locations: { name: "", description: "", sortOrder: 0, isActive: true },
  "area-types": {
    areaCategoryId: "",
    questionLabel: "",
    helperText: "",
    countOptions: ["0", "1", "2", "3+"],
    contextType: "INDOOR",
    levelMappingMode: "MULTI_LEVEL_ONLY",
    locationMappingMode: "NONE",
    childAreaCategoryId: null,
    childQuestionLabel: "",
    childCountOptions: null,
    requiresReferencePhoto: true,
    allowsIdentificationDescription: true,
    applicableApps: ["SUPERVISOR", "HOST"],
    displayOrder: 0,
    isActive: true,
  },
};

export default function OnboardingMasterManager({
  kind,
  title,
  description,
}: {
  kind: OnboardingMasterKind;
  title: string;
  description: string;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [draft, setDraft] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const result: any = await getOnboardingMaster(kind);
    if (result.success) setRows(result.data || []);
    else toast.error(result.message || "Unable to load configuration");
    if (kind === "area-types") {
      const cats: any = await getAuditMasterData("area-categories", {
        perPage: 500,
        orderBy: "weight",
        sortorder: "asc",
      });
      if (cats.success) setCategories(cats.data || []);
    }
    setLoading(false);
  }, [kind]);
  useEffect(() => {
    void load();
  }, [load]);
  const normalizedRows = useMemo(
    () =>
      rows.map((row) =>
        kind === "area-types" ? { ...row.config, areaName: row.areaName } : row,
      ),
    [rows, kind],
  );
  const save = async () => {
    if (!draft) return;
    if (kind !== "area-types" && !draft.name?.trim())
      return toast.error("Name is required");
    if (
      kind === "area-types" &&
      (!draft.areaCategoryId || !draft.questionLabel?.trim())
    )
      return toast.error("Area type and count question are required");
    setSaving(true);
    const payload = { ...draft };
    delete payload.id;
    delete payload.areaName;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.adminCreatedBy;
    delete payload.adminUpdatedBy;
    const result: any = draft.id
      ? await updateOnboardingMaster(kind, draft.id, payload)
      : await createOnboardingMaster(kind, payload);
    setSaving(false);
    if (!result.success) return toast.error(result.message || "Save failed");
    toast.success("Configuration saved");
    setDraft(null);
    await load();
  };
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <Button onClick={() => setDraft(structuredClone(defaults[kind]))}>
          <HiOutlinePlus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </div>
      <Card>
        {loading ? (
          <div className="flex justify-center p-8">
            <Spinner />
          </div>
        ) : (
          <Table hoverable>
            <TableHead>
              <TableRow>
                <TableHeadCell>Name</TableHeadCell>
                {kind === "levels" && <TableHeadCell>Family</TableHeadCell>}
                {kind === "area-types" && (
                  <>
                    <TableHeadCell>Context</TableHeadCell>
                    <TableHeadCell>Level rule</TableHeadCell>
                    <TableHeadCell>Apps</TableHeadCell>
                  </>
                )}
                <TableHeadCell>Order</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell />
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {normalizedRows.length ? (
                normalizedRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.name || row.areaName}
                    </TableCell>
                    {kind === "levels" && <TableCell>{row.family}</TableCell>}
                    {kind === "area-types" && (
                      <>
                        <TableCell>{row.contextType}</TableCell>
                        <TableCell>{row.levelMappingMode}</TableCell>
                        <TableCell>{row.applicableApps?.join(", ")}</TableCell>
                      </>
                    )}
                    <TableCell>{row.sortOrder ?? row.displayOrder}</TableCell>
                    <TableCell>
                      <Badge color={row.isActive ? "success" : "gray"}>
                        {row.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="xs"
                        color="light"
                        onClick={() => setDraft(structuredClone(row))}
                      >
                        <HiPencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-gray-500"
                  >
                    No configuration records yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>
      <Modal
        show={Boolean(draft)}
        onClose={() => !saving && setDraft(null)}
        size="3xl"
      >
        <ModalHeader>
          {draft?.id ? "Edit" : "Create"} {title}
        </ModalHeader>
        <ModalBody>
          {draft && (
            <div className="grid gap-4 md:grid-cols-2">
              {kind !== "area-types" ? (
                <>
                  <Field label="Name">
                    <TextInput
                      value={draft.name}
                      onChange={(e) =>
                        setDraft({ ...draft, name: e.target.value })
                      }
                    />
                  </Field>
                  {kind === "levels" ? (
                    <>
                      <Field label="Family">
                        <Select
                          value={draft.family}
                          onChange={(e) =>
                            setDraft({ ...draft, family: e.target.value })
                          }
                        >
                          {[
                            "BASEMENT",
                            "GROUND",
                            "UPPER",
                            "MEZZANINE",
                            "CUSTOM",
                          ].map((x) => (
                            <option key={x}>{x}</option>
                          ))}
                        </Select>
                      </Field>
                      <Check
                        label="Can be primary entrance"
                        checked={draft.canBePrimaryEntrance}
                        set={(v) =>
                          setDraft({ ...draft, canBePrimaryEntrance: v })
                        }
                      />
                      <Check
                        label="Default entrance"
                        checked={draft.isDefaultEntrance}
                        set={(v) =>
                          setDraft({ ...draft, isDefaultEntrance: v })
                        }
                      />
                    </>
                  ) : (
                    <Field label="Description">
                      <Textarea
                        value={draft.description || ""}
                        onChange={(e) =>
                          setDraft({ ...draft, description: e.target.value })
                        }
                      />
                    </Field>
                  )}
                  <Field label="Display order">
                    <TextInput
                      type="number"
                      value={draft.sortOrder}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          sortOrder: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Audit area type">
                    <Select
                      value={draft.areaCategoryId}
                      onChange={(e) =>
                        setDraft({ ...draft, areaCategoryId: e.target.value })
                      }
                    >
                      <option value="">Select</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Count question">
                    <TextInput
                      value={draft.questionLabel}
                      onChange={(e) =>
                        setDraft({ ...draft, questionLabel: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Helper text">
                    <Textarea
                      value={draft.helperText || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, helperText: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Count options (comma separated)">
                    <TextInput
                      value={draft.countOptions.join(", ")}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          countOptions: e.target.value
                            .split(",")
                            .map((x: string) => x.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </Field>
                  <Field label="Context">
                    <Select
                      value={draft.contextType}
                      onChange={(e) =>
                        setDraft({ ...draft, contextType: e.target.value })
                      }
                    >
                      {["INDOOR", "OUTDOOR", "EITHER"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Level mapping">
                    <Select
                      value={draft.levelMappingMode}
                      onChange={(e) =>
                        setDraft({ ...draft, levelMappingMode: e.target.value })
                      }
                    >
                      {[
                        "MULTI_LEVEL_ONLY",
                        "ALWAYS",
                        "INHERIT_PARENT",
                        "NONE",
                      ].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Location mapping">
                    <Select
                      value={draft.locationMappingMode}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          locationMappingMode: e.target.value,
                        })
                      }
                    >
                      {["NONE", "OPTIONAL", "REQUIRED"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Child area type">
                    <Select
                      value={draft.childAreaCategoryId || ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          childAreaCategoryId: e.target.value || null,
                        })
                      }
                    >
                      <option value="">None</option>
                      {categories
                        .filter((c) => c.id !== draft.areaCategoryId)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </Select>
                  </Field>
                  <Field label="Child count question">
                    <TextInput
                      value={draft.childQuestionLabel || ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          childQuestionLabel: e.target.value || null,
                        })
                      }
                    />
                  </Field>
                  <Field label="Child count options">
                    <TextInput
                      value={(draft.childCountOptions || []).join(", ")}
                      onChange={(e) => {
                        const values = e.target.value
                          .split(",")
                          .map((x: string) => x.trim())
                          .filter(Boolean);
                        setDraft({
                          ...draft,
                          childCountOptions: values.length ? values : null,
                        });
                      }}
                    />
                  </Field>
                  <Field label="Display order">
                    <TextInput
                      type="number"
                      value={draft.displayOrder}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          displayOrder: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                  <div className="space-y-3">
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
                          applicableApps: toggle(
                            draft.applicableApps,
                            "HOST",
                            v,
                          ),
                        })
                      }
                    />
                    <Check
                      label="Reference photo required"
                      checked={draft.requiresReferencePhoto}
                      set={(v) =>
                        setDraft({ ...draft, requiresReferencePhoto: v })
                      }
                    />
                    <Check
                      label="Identification description allowed"
                      checked={draft.allowsIdentificationDescription}
                      set={(v) =>
                        setDraft({
                          ...draft,
                          allowsIdentificationDescription: v,
                        })
                      }
                    />
                  </div>
                </>
              )}
              <div className="md:col-span-2">
                <ToggleSwitch
                  checked={draft.isActive}
                  label="Active"
                  onChange={(v) => setDraft({ ...draft, isActive: v })}
                />
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button color="gray" onClick={() => setDraft(null)} disabled={saving}>
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
      <Label className="mb-2 block">{label}</Label>
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
function toggle(values: string[], value: string, enabled: boolean) {
  return enabled
    ? [...new Set([...values, value])]
    : values.filter((x) => x !== value);
}
