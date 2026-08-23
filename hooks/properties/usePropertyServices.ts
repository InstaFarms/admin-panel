"use client";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { v4 } from "uuid";
import type { AuditArea, CancellationPlan, DiscountPlan, User } from "@/utils/types";
import { searchUser } from "@/actions/userActions";
import { getSupervisors } from "@/actions/supervisorActions";
import { searchDiscountPlan } from "@/actions/discountPlanActions";
import { searchCancellationPlan } from "@/actions/cancellationPlanActions";
import {
  addIcalLink,
  deleteIcalLink,
  fetchIcalLinks,
  getExportUrl,
  syncIcalLink,
} from "@/actions/icalActions";
import {
  addAuditChecklistItem,
  createAuditArea,
  deleteAuditArea,
  deleteAuditChecklistItem,
  getAuditAreaItems,
  getAuditAreas,
  updateAuditChecklistItem,
} from "@/actions/auditActions";

interface AuditAreaDraft {
  id: string;
  areaCategoryId: string;
  areaName: string;
  weight: number;
  isSystemArea: boolean;
  isActive: boolean;
}

interface AuditItemDraft {
  id: string;
  propertyAuditAreaId: string;
  type: "INVENTORY" | "SUPPLIES" | "MAINTENANCE";
  [key: string]: unknown;
}

export function usePropertyServices(propertyId?: string | null) {
  const isEditMode = Boolean(propertyId);

  const [icalLinks, setIcalLinks] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLink, setNewLink] = useState<{ name: string; icalUrl: string; roomId: string | null }>({ name: "", icalUrl: "", roomId: null });
  const [exportUrl, setExportUrl] = useState<string>("");
  const [icalLoading, setIcalLoading] = useState(false);
  const [icalLoaded, setIcalLoaded] = useState(false);
  const [icalBootstrapLoading, setIcalBootstrapLoading] = useState(false);

  const [supervisors, setSupervisors] = useState<
    { id: string; name: string; phone: string; email: string }[]
  >([]);
  const [supervisorsLoaded, setSupervisorsLoaded] = useState(false);

  const ensureSupervisorsLoaded = useCallback(async () => {
    if (supervisorsLoaded) return;
    try {
      const result = await getSupervisors();
      if (result.success) setSupervisors(result.data || []);
    } catch (err) {
      console.error("Error loading supervisors:", err);
    } finally {
      setSupervisorsLoaded(true);
    }
  }, [supervisorsLoaded]);

  const [auditAreas, setAuditAreas] = useState<AuditArea[]>([]);
  const [unsavedAuditAreas, setUnsavedAuditAreas] = useState<AuditAreaDraft[]>([]);
  const [unsavedAuditItems, setUnsavedAuditItems] = useState<AuditItemDraft[]>([]);
  const [auditAreasLoading, setAuditAreasLoading] = useState(false);
  const [auditAreasLoaded, setAuditAreasLoaded] = useState(false);

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) return [] as User[];
    try {
      const formData = new FormData();
      formData.append("searchKey", "Name");
      formData.append("searchValue", query);
      const result = await searchUser(formData);
      return (result.data as User[]) || [];
    } catch (error) {
      console.error("Search error:", error);
      return [] as User[];
    }
  }, []);

  const searchDiscountPlans = useCallback(async (query: string, appType?: string) => {
    if (!query.trim()) return [] as DiscountPlan[];
    try {
      const formData = new FormData();
      formData.append("searchKey", "Name");
      formData.append("searchValue", query);
      if (appType) formData.append("adminAppType", appType);
      const result = await searchDiscountPlan(formData);
      return (result.data as DiscountPlan[]) || [];
    } catch (error) {
      console.error("Search error:", error);
      return [] as DiscountPlan[];
    }
  }, []);

  const searchShortTermPlans = useCallback(async (query: string, appType?: string) => {
    if (!query.trim()) return [] as CancellationPlan[];
    try {
      const formData = new FormData();
      formData.append("searchKey", "Name");
      formData.append("searchValue", query);
      if (appType) formData.append("adminAppType", appType);
      const result = await searchCancellationPlan(formData);
      return (result.data as CancellationPlan[]) || [];
    } catch (error) {
      console.error("Search error:", error);
      return [] as CancellationPlan[];
    }
  }, []);

  const searchLongTermPlans = useCallback(async (query: string, appType?: string) => {
    if (!query.trim()) return [] as CancellationPlan[];
    try {
      const formData = new FormData();
      formData.append("searchKey", "Name");
      formData.append("searchValue", query);
      if (appType) formData.append("adminAppType", appType);
      const result = await searchCancellationPlan(formData);
      return (result.data as CancellationPlan[]) || [];
    } catch (error) {
      console.error("Search error:", error);
      return [] as CancellationPlan[];
    }
  }, []);

  const loadIcalLinks = useCallback(async () => {
    if (!propertyId) return;
    const result = await fetchIcalLinks(propertyId);
    if (result.error) {
      toast.error(result.error);
      setIcalLinks([]);
      return;
    }
    setIcalLinks(result.data || []);
  }, [propertyId]);

  const loadExportUrl = useCallback(async () => {
    if (!propertyId) return;
    const url = await getExportUrl(propertyId);
    setExportUrl(url);
  }, [propertyId]);

  const ensureIcalLoaded = useCallback(async () => {
    if (!propertyId || icalLoaded || icalBootstrapLoading) return;
    setIcalBootstrapLoading(true);
    try {
      await Promise.all([loadIcalLinks(), loadExportUrl()]);
      setIcalLoaded(true);
    } catch (err) {
      console.error("Error loading iCal data:", err);
      toast.error("Failed to load iCal data");
    } finally {
      setIcalBootstrapLoading(false);
    }
  }, [propertyId, icalLoaded, icalBootstrapLoading, loadExportUrl, loadIcalLinks]);

  const handleAddIcalLink = async () => {
    if (!newLink.name || !newLink.icalUrl) {
      toast.error("Please fill all fields");
      return false;
    }
    if (!propertyId) {
      toast.error("Property ID is required");
      return false;
    }
    setIcalLoading(true);
    try {
      const result = await addIcalLink(propertyId, newLink.name, newLink.icalUrl, newLink.roomId);
      if (result.error) {
        toast.error(result.error);
        return false;
      }
      toast.success(result.success || "Link added");
      setNewLink({ name: "", icalUrl: "", roomId: null });
      setShowAddForm(false);
      await loadIcalLinks();
      return true;
    } finally {
      setIcalLoading(false);
    }
  };

  const handleSyncIcalLink = async (linkId: string) => {
    setIcalLoading(true);
    try {
      const result = await syncIcalLink(linkId);
      if (result.error) {
        toast.error(result.error);
        return false;
      }
      toast.success(result.success || "Synced");
      await loadIcalLinks();
      return true;
    } finally {
      setIcalLoading(false);
    }
  };

  const handleDeleteIcalLink = async (linkId: string) => {
    setIcalLoading(true);
    try {
      const result = await deleteIcalLink(linkId);
      if (result.error) {
        toast.error(result.error);
        return false;
      }
      toast.success(result.success || "Deleted");
      await loadIcalLinks();
      return true;
    } finally {
      setIcalLoading(false);
    }
  };

  const handleCopyExportUrl = () => {
    navigator.clipboard.writeText(exportUrl);
    toast.success("Export URL copied!");
  };

  const loadAuditAreas = useCallback(async () => {
    if (!propertyId) return;
    setAuditAreasLoading(true);
    try {
      const result = await getAuditAreas(propertyId);
      if (result.success) {
        setAuditAreas(result.data || []);
        setAuditAreasLoaded(true);
      }
    } catch (err) {
      console.error("Error loading audit areas:", err);
    } finally {
      setAuditAreasLoading(false);
    }
  }, [propertyId]);

  const ensureAuditAreasLoaded = useCallback(async () => {
    if (auditAreasLoaded || auditAreasLoading) return;
    await loadAuditAreas();
  }, [auditAreasLoaded, auditAreasLoading, loadAuditAreas]);

  const handleAddAuditArea = async (data: {
    categoryId: string;
    name: string;
    weight: number;
    isSystemArea: boolean;
    isActive: boolean;
  }) => {
    if (!propertyId) return false;
    const tempId = `temp-${v4()}`;
    const newArea: AuditAreaDraft = {
      id: tempId,
      areaCategoryId: data.categoryId,
      areaName: data.name,
      weight: data.weight,
      isSystemArea: data.isSystemArea,
      isActive: data.isActive,
    };
    setAuditAreas((prev) => [
      ...prev,
      {
        ...(newArea as unknown as AuditArea),
        categoryName: "New Area",
        propertyId,
      },
    ]);
    setUnsavedAuditAreas((prev) => [...prev, newArea]);
    toast.success("Area added to queue. Please update the property to save it.");
    return true;
  };

  const saveUnsavedAreas = async (propertyIdOverride?: string): Promise<boolean> => {
    if (unsavedAuditAreas.length === 0) return true;
    const effectivePropertyId = propertyIdOverride || propertyId;
    if (!effectivePropertyId) return false;

    let allSuccess = true;
    for (const area of unsavedAuditAreas) {
      const result = await createAuditArea({
        propertyId: effectivePropertyId,
        areaCategoryId: area.areaCategoryId,
        areaName: area.areaName,
        weight: area.weight,
        isSystemArea: area.isSystemArea,
        isActive: area.isActive,
      });

      if (!result.success) {
        toast.error(`Failed to save area: ${area.areaName}`);
        allSuccess = false;
        continue;
      }

      const realAreaId = result.data?.id;
      const itemsToSave = unsavedAuditItems.filter((i) => i.propertyAuditAreaId === area.id);
      for (const item of itemsToSave) {
        const itemResult = await addAuditChecklistItem(
          effectivePropertyId,
          item.type,
          { ...item, propertyAuditAreaId: realAreaId },
        );
        if (!itemResult.success) {
          toast.error(`Failed to save item: ${String(item.name || "Unnamed item")}`);
          allSuccess = false;
        }
      }
    }

    if (allSuccess) {
      setUnsavedAuditAreas([]);
      setUnsavedAuditItems([]);
      if (effectivePropertyId === propertyId) {
        await loadAuditAreas();
      }
    }
    return allSuccess;
  };

  const handleRemoveAuditArea = async (id: string) => {
    if (!propertyId) return false;
    if (id.startsWith("temp-")) {
      setAuditAreas((prev) => prev.filter((a) => a.id !== id));
      setUnsavedAuditAreas((prev) => prev.filter((a) => a.id !== id));
      setUnsavedAuditItems((prev) => prev.filter((i) => i.propertyAuditAreaId !== id));
      toast.success("Queued area removed.");
      return true;
    }

    const result = await deleteAuditArea(propertyId, id);
    if (!result.success) {
      toast.error(result.message || "Failed to remove area");
      return false;
    }

    toast.success("Audit Area removed");
    await loadAuditAreas();
    return true;
  };

  const getAuditAreaItemsWrapper = async (areaId: string) => {
    if (areaId.startsWith("temp-")) {
      return {
        success: true,
        data: { inventory: [], supplies: [], maintenance: [] },
      };
    }
    return getAuditAreaItems(areaId);
  };

  const handleAddChecklistItem = async (
    auditAreaId: string,
    type: "INVENTORY" | "SUPPLIES" | "MAINTENANCE",
    data: Record<string, unknown>,
  ) => {
    if (!propertyId) return false;
    if (auditAreaId.startsWith("temp-")) {
      const tempId = `temp-item-${v4()}`;
      setUnsavedAuditItems((prev) => [
        ...prev,
        { ...data, propertyAuditAreaId: auditAreaId, type, id: tempId } as AuditItemDraft,
      ]);
      toast.success("Item added to queue.");
      return true;
    }

    const result = await addAuditChecklistItem(propertyId, type, {
      ...data,
      propertyAuditAreaId: auditAreaId,
    });
    if (!result.success) {
      toast.error(result.message || "Failed to add item");
      return false;
    }
    toast.success("Item added");
    return true;
  };

  const handleRemoveChecklistItem = async (
    type: "INVENTORY" | "SUPPLIES" | "MAINTENANCE",
    id: string,
  ) => {
    if (!propertyId) return false;
    if (id.startsWith("temp-item-")) {
      setUnsavedAuditItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Queued item removed.");
      return true;
    }

    const result = await deleteAuditChecklistItem(propertyId, type, id);
    if (!result.success) {
      toast.error(result.message || "Failed to remove item");
      return false;
    }
    toast.success("Item removed");
    return true;
  };

  const handleUpdateChecklistItem = async (
    type: "INVENTORY" | "SUPPLIES" | "MAINTENANCE",
    id: string,
    data: Record<string, unknown>,
  ) => {
    if (!propertyId) return false;
    if (id.startsWith("temp-item-")) {
      setUnsavedAuditItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...data } : item)),
      );
      toast.success("Queued item updated.");
      return true;
    }

    const result = await updateAuditChecklistItem(propertyId, type, id, data);
    if (!result.success) {
      toast.error(result.message || "Failed to update item");
      return false;
    }
    toast.success("Item updated");
    return true;
  };

  return {
    isEditMode,
    searchUsers,
    supervisors,
    ensureSupervisorsLoaded,
    searchDiscountPlans,
    searchShortTermPlans,
    searchLongTermPlans,
    icalLinks,
    showAddForm,
    setShowAddForm,
    newLink,
    setNewLink,
    exportUrl,
    icalLoading,
    icalBootstrapLoading,
    ensureIcalLoaded,
    handleAddIcalLink,
    handleSyncIcalLink,
    handleDeleteIcalLink,
    handleCopyExportUrl,
    auditAreas,
    auditAreasLoaded,
    auditAreasLoading,
    unsavedAuditItems,
    ensureAuditAreasLoaded,
    handleAddAuditArea,
    handleRemoveAuditArea,
    getAuditAreaItems: getAuditAreaItemsWrapper,
    handleAddChecklistItem,
    handleUpdateChecklistItem,
    handleRemoveChecklistItem,
    saveUnsavedAreas,
  };
}

export type UsePropertyServicesReturn = ReturnType<typeof usePropertyServices>;
