"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Breadcrumb,
  BreadcrumbItem,
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
import {
  HiCheck,
  HiClipboardList,
  HiOutlinePlus,
  HiPencil,
  HiTrash,
} from "react-icons/hi";
import toast from "react-hot-toast";

import { getAuditMasterData } from "@/actions/auditMasterActions";
import {
  createAuditTemplate,
  deleteAuditTemplate,
  getAuditTemplates,
  updateAuditTemplate,
} from "@/actions/auditTemplateActions";

type ItemType = "INVENTORY" | "SUPPLIES" | "MAINTENANCE";

interface MasterItem {
  id: string;
  name: string;
  itemType: ItemType;
  defaultPhotoRequirementType: PhotoRequirement;
}

interface AreaCategory {
  id: string;
  name: string;
  weight: number;
}

type PhotoRequirement =
  | "ALWAYS_REQUIRED"
  | "REQUIRED_IF_ISSUE"
  | "NOT_REQUIRED";

interface TemplateItem {
  checklistItemMasterId: string;
  name: string;
  itemType: ItemType;
  photoRequirementType: PhotoRequirement;
  weight: number;
  expectedQuantity: number | null;
  requiredThreshold: number | null;
  criticalThreshold: number | null;
}

interface TemplateArea {
  areaCategoryId: string;
  areaName: string;
  weight: number;
  items: TemplateItem[];
}

interface TemplateDraft {
  id?: string;
  name: string;
  description: string;
  isDefault: boolean;
  isActive: boolean;
  areas: TemplateArea[];
}

const emptyDraft = (): TemplateDraft => ({
  name: "",
  description: "",
  isDefault: false,
  isActive: true,
  areas: [],
});

const toDraft = (template: any): TemplateDraft => ({
  id: template.id,
  name: template.name,
  description: template.description ?? "",
  isDefault: Boolean(template.isDefault),
  isActive: Boolean(template.isActive),
  areas: (template.areas ?? []).map((area: any) => ({
    areaCategoryId: area.areaCategoryId,
    areaName: area.areaName,
    weight: Number(area.weight ?? 0),
    items: (area.items ?? []).map((item: any) => ({
      checklistItemMasterId: item.checklistItemMasterId,
      name: item.name,
      itemType: item.itemType,
      photoRequirementType: item.photoRequirementType,
      weight: Number(item.weight ?? 0),
      expectedQuantity: item.expectedQuantity,
      requiredThreshold: item.requiredThreshold,
      criticalThreshold: item.criticalThreshold,
    })),
  })),
});

export default function AuditTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [categories, setCategories] = useState<AreaCategory[]>([]);
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<TemplateDraft | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [templateResult, categoryResult, itemResult] = await Promise.all([
      getAuditTemplates(),
      getAuditMasterData("area-categories", {
        perPage: 500,
        orderBy: "name",
        sortorder: "asc",
      }),
      getAuditMasterData("checklist-items", {
        perPage: 1000,
        orderBy: "name",
        sortorder: "asc",
      }),
    ]);

    if (templateResult.success) setTemplates(templateResult.data ?? []);
    else toast.error(templateResult.message || "Unable to load templates");
    if (categoryResult.success) setCategories(categoryResult.data ?? []);
    if (itemResult.success) setMasterItems(itemResult.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalAreas = useMemo(
    () => templates.reduce((sum, template) => sum + (template.areas?.length ?? 0), 0),
    [templates]
  );

  const updateArea = (index: number, patch: Partial<TemplateArea>) => {
    setDraft((current) => {
      if (!current) return current;
      const areas = [...current.areas];
      areas[index] = { ...areas[index], ...patch };
      return { ...current, areas };
    });
  };

  const addArea = () => {
    const category = categories[0];
    if (!category) {
      toast.error("Create an audit area type first");
      return;
    }
    setDraft((current) =>
      current
        ? {
            ...current,
            areas: [
              ...current.areas,
              {
                areaCategoryId: category.id,
                areaName: category.name,
                weight: category.weight ?? 0,
                items: [],
              },
            ],
          }
        : current
    );
  };

  const removeArea = (index: number) => {
    setDraft((current) =>
      current
        ? { ...current, areas: current.areas.filter((_, i) => i !== index) }
        : current
    );
  };

  const addItem = (areaIndex: number, masterId: string) => {
    if (!masterId) return;
    const master = masterItems.find((item) => item.id === masterId);
    if (!master) return;
    const area = draft?.areas[areaIndex];
    if (area?.items.some((item) => item.checklistItemMasterId === masterId)) {
      toast.error("That checklist item is already selected");
      return;
    }
    const quantityType = master.itemType !== "MAINTENANCE";
    updateArea(areaIndex, {
      items: [
        ...(area?.items ?? []),
        {
          checklistItemMasterId: master.id,
          name: master.name,
          itemType: master.itemType,
          photoRequirementType:
            master.defaultPhotoRequirementType ?? "REQUIRED_IF_ISSUE",
          weight: 0,
          expectedQuantity: quantityType ? 1 : null,
          requiredThreshold: quantityType ? 1 : null,
          criticalThreshold: quantityType ? 0 : null,
        },
      ],
    });
  };

  const updateItem = (
    areaIndex: number,
    itemIndex: number,
    patch: Partial<TemplateItem>
  ) => {
    const area = draft?.areas[areaIndex];
    if (!area) return;
    const items = [...area.items];
    items[itemIndex] = { ...items[itemIndex], ...patch };
    updateArea(areaIndex, { items });
  };

  const removeItem = (areaIndex: number, itemIndex: number) => {
    const area = draft?.areas[areaIndex];
    if (!area) return;
    updateArea(areaIndex, {
      items: area.items.filter((_, index) => index !== itemIndex),
    });
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (!draft.areas.length) {
      toast.error("Add at least one room");
      return;
    }
    if (draft.areas.some((area) => !area.areaName.trim())) {
      toast.error("Every room needs a name");
      return;
    }

    setSaving(true);
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      isDefault: draft.isDefault,
      isActive: draft.isActive,
      areas: draft.areas.map((area) => ({
        areaCategoryId: area.areaCategoryId,
        areaName: area.areaName.trim(),
        weight: Number(area.weight || 0),
        items: area.items.map(({ name: _name, itemType: _type, ...item }) => item),
      })),
    };

    const result = draft.id
      ? await updateAuditTemplate(draft.id, payload)
      : await createAuditTemplate(payload);
    setSaving(false);
    if (!result.success) {
      toast.error(result.message || "Unable to save template");
      return;
    }
    toast.success(draft.id ? "Template updated" : "Template created");
    setDraft(null);
    await load();
  };

  const removeTemplate = async (template: any) => {
    if (
      !window.confirm(
        `Deactivate "${template.name}"? Property audit configurations already created from it will remain unchanged.`
      )
    ) {
      return;
    }
    const result = await deleteAuditTemplate(template.id);
    if (!result.success) {
      toast.error(result.message || "Unable to delete template");
      return;
    }
    toast.success("Template deactivated");
    await load();
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Audit Templates
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
            Build reusable room checklists for hosts and supervisors. Applying a
            template creates editable property-level copies, so later template
            changes never overwrite live property setup.
          </p>
        </div>
        <Button onClick={() => setDraft(emptyDraft())}>
          <HiOutlinePlus className="mr-2 h-5 w-5" />
          New Template
        </Button>
      </div>

      <Breadcrumb className="mb-5">
        <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
        <BreadcrumbItem>Audit Master</BreadcrumbItem>
        <BreadcrumbItem>Templates</BreadcrumbItem>
      </Breadcrumb>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-gray-500">Templates</p>
          <p className="text-3xl font-bold">{templates.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Configured rooms</p>
          <p className="text-3xl font-bold">{totalAreas}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Default</p>
          <p className="truncate text-lg font-semibold">
            {templates.find((template) => template.isDefault)?.name || "Not set"}
          </p>
        </Card>
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Spinner size="xl" />
        </div>
      ) : templates.length === 0 ? (
        <Card className="text-center">
          <HiClipboardList className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="text-lg font-semibold">No audit templates</h2>
          <p className="text-sm text-gray-500">
            Create the first reusable setup for your properties.
          </p>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold">{template.name}</h2>
                    {template.isDefault && (
                      <Badge color="success" icon={HiCheck}>
                        Default
                      </Badge>
                    )}
                    {!template.isActive && <Badge color="gray">Inactive</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {template.description || "No description"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="xs" color="light" onClick={() => setDraft(toDraft(template))}>
                    <HiPencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="xs"
                    color="failure"
                    disabled={template.isDefault}
                    onClick={() => void removeTemplate(template)}
                  >
                    <HiTrash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {(template.areas ?? []).map((area: any) => (
                  <div
                    key={area.id}
                    className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                  >
                    <div className="flex justify-between gap-3">
                      <span className="font-semibold">{area.areaName}</span>
                      <Badge color="info">{area.items?.length ?? 0} items</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                      {(area.items ?? []).map((item: any) => item.name).join(", ") ||
                        "No items selected"}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal show={Boolean(draft)} onClose={() => !saving && setDraft(null)} size="7xl">
        <ModalHeader>
          {draft?.id ? "Edit Audit Template" : "Create Audit Template"}
        </ModalHeader>
        <ModalBody>
          {draft && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="template-name">Template name</Label>
                  <TextInput
                    id="template-name"
                    value={draft.name}
                    onChange={(event) =>
                      setDraft({ ...draft, name: event.target.value })
                    }
                    placeholder="Standard Property Audit"
                    required
                  />
                </div>
                <div className="flex items-end gap-6 pb-2">
                  <Label className="flex items-center gap-2">
                    <Checkbox
                      checked={draft.isDefault}
                      onChange={(event) =>
                        setDraft({ ...draft, isDefault: event.target.checked })
                      }
                    />
                    Default template
                  </Label>
                  <Label className="flex items-center gap-2">
                    <Checkbox
                      checked={draft.isActive}
                      onChange={(event) =>
                        setDraft({ ...draft, isActive: event.target.checked })
                      }
                    />
                    Active
                  </Label>
                </div>
              </div>
              <div>
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  rows={2}
                  value={draft.description}
                  onChange={(event) =>
                    setDraft({ ...draft, description: event.target.value })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">Rooms and pre-selected items</h3>
                  <p className="text-sm text-gray-500">
                    Quantities apply to inventory and supplies. Maintenance items
                    use condition checks.
                  </p>
                </div>
                <Button size="sm" color="light" onClick={addArea}>
                  <HiOutlinePlus className="mr-2 h-4 w-4" />
                  Add Room
                </Button>
              </div>

              {draft.areas.map((area, areaIndex) => (
                <div
                  key={`${area.areaCategoryId}-${areaIndex}`}
                  className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                >
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_120px_auto]">
                    <div>
                      <Label>Room type</Label>
                      <Select
                        value={area.areaCategoryId}
                        onChange={(event) => {
                          const category = categories.find(
                            (candidate) => candidate.id === event.target.value
                          );
                          updateArea(areaIndex, {
                            areaCategoryId: event.target.value,
                            areaName: category?.name ?? area.areaName,
                            weight: category?.weight ?? area.weight,
                          });
                        }}
                      >
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label>Room label</Label>
                      <TextInput
                        value={area.areaName}
                        onChange={(event) =>
                          updateArea(areaIndex, { areaName: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Weight</Label>
                      <TextInput
                        type="number"
                        value={area.weight}
                        onChange={(event) =>
                          updateArea(areaIndex, {
                            weight: Number(event.target.value),
                          })
                        }
                      />
                    </div>
                    <Button
                      className="self-end"
                      color="failure"
                      size="sm"
                      onClick={() => removeArea(areaIndex)}
                    >
                      <HiTrash className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-4">
                    <Label>Add checklist item</Label>
                    <Select
                      value=""
                      onChange={(event) => addItem(areaIndex, event.target.value)}
                    >
                      <option value="">Select an item…</option>
                      {masterItems
                        .filter(
                          (item) =>
                            !area.items.some(
                              (selected) =>
                                selected.checklistItemMasterId === item.id
                            )
                        )
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} · {item.itemType}
                          </option>
                        ))}
                    </Select>
                  </div>

                  <div className="mt-3 space-y-2">
                    {area.items.map((item, itemIndex) => (
                      <div
                        key={item.checklistItemMasterId}
                        className="grid items-end gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800 md:grid-cols-[minmax(180px,1fr)_100px_125px_125px_160px_auto]"
                      >
                        <div>
                          <span className="font-medium">{item.name}</span>
                          <Badge className="mt-1 w-fit" color="gray">
                            {item.itemType}
                          </Badge>
                        </div>
                        <div>
                          <Label>Weight</Label>
                          <TextInput
                            type="number"
                            value={item.weight}
                            onChange={(event) =>
                              updateItem(areaIndex, itemIndex, {
                                weight: Number(event.target.value),
                              })
                            }
                          />
                        </div>
                        {item.itemType !== "MAINTENANCE" ? (
                          <>
                            <div>
                              <Label>Expected</Label>
                              <TextInput
                                type="number"
                                min={0}
                                value={item.expectedQuantity ?? 0}
                                onChange={(event) =>
                                  updateItem(areaIndex, itemIndex, {
                                    expectedQuantity: Number(event.target.value),
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label>Required</Label>
                              <TextInput
                                type="number"
                                min={0}
                                value={item.requiredThreshold ?? 0}
                                onChange={(event) =>
                                  updateItem(areaIndex, itemIndex, {
                                    requiredThreshold: Number(event.target.value),
                                  })
                                }
                              />
                            </div>
                          </>
                        ) : (
                          <div className="md:col-span-2" />
                        )}
                        <div>
                          <Label>Photo rule</Label>
                          <Select
                            value={item.photoRequirementType}
                            onChange={(event) =>
                              updateItem(areaIndex, itemIndex, {
                                photoRequirementType: event.target
                                  .value as PhotoRequirement,
                              })
                            }
                          >
                            <option value="ALWAYS_REQUIRED">Always</option>
                            <option value="REQUIRED_IF_ISSUE">If issue</option>
                            <option value="NOT_REQUIRED">Not required</option>
                          </Select>
                        </div>
                        <Button
                          color="failure"
                          size="xs"
                          onClick={() => removeItem(areaIndex, itemIndex)}
                        >
                          <HiTrash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {area.items.length === 0 && (
                      <p className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
                        This room has no pre-selected checklist items yet.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => void save()} disabled={saving}>
            {saving && <Spinner className="mr-2" size="sm" />}
            Save Template
          </Button>
          <Button color="gray" onClick={() => setDraft(null)} disabled={saving}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
