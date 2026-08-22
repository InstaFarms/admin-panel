"use client";

import { useState, useEffect, useMemo } from "react";

import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Label,
  Select,
  TextInput,
  ToggleSwitch,
} from "flowbite-react";

import { getAuditMasterData } from "@/actions/auditMasterActions";

import SearchableSelect from "@/components/SearchableSelect";
import { AnimatedModalContent } from "@/components/ui/AnimatedModalContent";

interface AddChecklistItemModalProps {
  show: boolean;
  type: "INVENTORY" | "SUPPLIES" | "MAINTENANCE";
  initialData?: any;
  onClose: () => void;
  onSave: (data: any) => Promise<boolean>;
}

export default function AddChecklistItemModal({
  show,
  type,
  initialData,
  onClose,
  onSave,
}: AddChecklistItemModalProps) {
  const [masterItems, setMasterItems] = useState<any[]>([]);
  const [categoryItems, setCategoryItems] = useState<any[] | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedMasterId, setSelectedMasterId] = useState("");
  const [expectedQuantity, setExpectedQuantity] = useState(1);
  const [requiredThreshold, setRequiredThreshold] = useState(1);
  const [criticalThreshold, setCriticalThreshold] = useState(0);
  const [photoRequirement, setPhotoRequirement] = useState("ALWAYS_REQUIRED");
  const [weight, setWeight] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      loadMasterData();
      if (initialData) {
        setSelectedMasterId(initialData.checklistItemMasterId || initialData.masterId || "");
        setExpectedQuantity(initialData.expectedQuantity || 0);
        setRequiredThreshold(initialData.requiredThreshold || 0);
        setCriticalThreshold(initialData.criticalThreshold || 0);
        setPhotoRequirement(initialData.photoRequirementType || "ALWAYS_REQUIRED");
        setWeight(initialData.weight ?? 0);
        setIsActive(initialData.isActive ?? true);
      } else {
        setSelectedCategoryId("");
        setSelectedMasterId("");
        setExpectedQuantity(1);
        setRequiredThreshold(1);
        setCriticalThreshold(0);
        setPhotoRequirement("ALWAYS_REQUIRED");
        setWeight(0);
        setIsActive(true);
      }
    }
  }, [show, type, initialData]);

  useEffect(() => {
    if (initialData && masterItems.length > 0) {
      const masterId = initialData.checklistItemMasterId || initialData.masterId;
      const match = masterItems.find((item) => item.id === masterId);
      if (match?.categoryId) setSelectedCategoryId(match.categoryId);
    }
  }, [initialData, masterItems]);

  // Master item lists can exceed the page size, so once a category is picked we
  // re-fetch that category's items from the server instead of trusting the
  // (possibly truncated) unfiltered list — otherwise items outside the first
  // page silently disappear from the dropdown.
  useEffect(() => {
    if (show && selectedCategoryId) {
      loadCategoryItems(selectedCategoryId);
    } else {
      setCategoryItems(null);
    }
  }, [show, selectedCategoryId, type]);

  const loadMasterData = async () => {
    try {
      const [itemsRes, categoriesRes] = await Promise.all([
        getAuditMasterData("checklist-items", { perPage: 100, itemType: type }),
        getAuditMasterData("checklist-categories", {
          perPage: 100,
          itemType: type,
        }),
      ]);
      setMasterItems(itemsRes?.data || []);
      setCategories(categoriesRes?.data || []);
    } catch (err) {
      console.error("Failed to load audit master data", err);
    }
  };

  const loadCategoryItems = async (categoryId: string) => {
    try {
      const res = await getAuditMasterData("checklist-items", {
        perPage: 100,
        itemType: type,
        categoryId,
      });
      setCategoryItems(res?.data || []);
    } catch (err) {
      console.error("Failed to load items for category", err);
      setCategoryItems([]);
    }
  };

  const filteredItems = useMemo(() => {
    if (!selectedCategoryId) return masterItems;
    if (categoryItems) return categoryItems;
    return masterItems.filter((item) => item.categoryId === selectedCategoryId);
  }, [masterItems, categoryItems, selectedCategoryId]);

  const categoryOptions = useMemo(() => categories.map((c) => ({ value: c.id, label: c.name })), [categories]);

  const itemOptions = useMemo(
    () => filteredItems.map((item) => ({ value: item.id, label: item.name })),
    [filteredItems],
  );

  const handleSave = async () => {
    if (!selectedMasterId) return;

    const data: any = {
      photoRequirementType: photoRequirement,
    };
    if (weight !== undefined) data.weight = weight;
    if (isActive !== undefined) data.isActive = isActive;

    if (!initialData || selectedMasterId !== (initialData.checklistItemMasterId || initialData.masterId)) {
      const selectedItem = masterItems.find((item) => item.id === selectedMasterId);
      data.checklistItemMasterId = selectedMasterId;
      data.name = selectedItem?.name || "";
    }

    if (type !== "MAINTENANCE") {
      data.expectedQuantity = Number(expectedQuantity);
      data.requiredThreshold = Number(requiredThreshold);
      data.criticalThreshold = Number(criticalThreshold);
    }

    setLoading(true);
    try {
      const res = await onSave(data);
      if (res && !initialData) {
        setSelectedCategoryId("");
        setSelectedMasterId("");
        setExpectedQuantity(1);
        setRequiredThreshold(1);
        setCriticalThreshold(0);
        setWeight(0);
        setIsActive(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onClose={onClose}>
      <AnimatedModalContent>
        <ModalHeader>
          {initialData ? "Edit" : "Add"} {type.charAt(0) + type.slice(1).toLowerCase()} Item
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <SearchableSelect
                id="checklistCategory"
                label="Checklist Category"
                placeholder="All categories"
                options={categoryOptions}
                value={selectedCategoryId}
                onChange={(val) => {
                  setSelectedCategoryId(val);
                  setSelectedMasterId("");
                }}
                disabled={Boolean(initialData)}
              />
            </div>
            <div>
              <SearchableSelect
                id="masterItem"
                label="Select Item"
                placeholder="Search items..."
                options={itemOptions}
                value={selectedMasterId}
                onChange={setSelectedMasterId}
                required
                disabled={Boolean(initialData)}
              />
              {initialData && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  The checklist item is fixed after creation so completed audit records keep their original identity.
                </p>
              )}
            </div>

            {type !== "MAINTENANCE" && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="mb-2 block">
                    <Label htmlFor="expected" className="text-xs">
                      Expected Qty
                    </Label>
                  </div>
                  <TextInput
                    id="expected"
                    type="number"
                    value={expectedQuantity.toString()}
                    onChange={(e) => setExpectedQuantity(parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
                <div>
                  <div className="mb-2 block">
                    <Label htmlFor="required" className="text-xs">
                      Required Thr.
                    </Label>
                  </div>
                  <TextInput
                    id="required"
                    type="number"
                    value={requiredThreshold.toString()}
                    onChange={(e) => setRequiredThreshold(parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
                <div>
                  <div className="mb-2 block">
                    <Label htmlFor="critical" className="text-xs">
                      Critical Thr.
                    </Label>
                  </div>
                  <TextInput
                    id="critical"
                    type="number"
                    value={criticalThreshold.toString()}
                    onChange={(e) => setCriticalThreshold(parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 block">
                <Label htmlFor="photoReq">Photo Requirement</Label>
              </div>
              <Select id="photoReq" value={photoRequirement} onChange={(e) => setPhotoRequirement(e.target.value)}>
                <option value="ALWAYS_REQUIRED">Always Required</option>
                <option value="REQUIRED_IF_ISSUE">Required If Issue</option>
                <option value="NOT_REQUIRED">Not Required</option>
              </Select>
            </div>

            <div>
              <div className="mb-2 block">
                <Label htmlFor="weight">Weight / Order</Label>
              </div>
              <TextInput
                id="weight"
                type="number"
                value={weight.toString()}
                onChange={(e) => setWeight(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="flex flex-col gap-4 pt-2">
              <ToggleSwitch checked={isActive} label="Is Active" onChange={setIsActive} />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button onClick={handleSave} disabled={loading || !selectedMasterId}>
            {loading ? (initialData ? "Updating..." : "Adding...") : initialData ? "Update Item" : "Add Item"}
          </Button>
          <Button color="gray" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </AnimatedModalContent>
    </Modal>
  );
}
