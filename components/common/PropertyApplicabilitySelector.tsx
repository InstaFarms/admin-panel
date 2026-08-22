import { HiTrash, HiLocationMarker, HiExclamation } from "react-icons/hi";
import { useState, useMemo } from "react";
import { Label, Modal, Button, ModalHeader, ModalBody } from "flowbite-react";
import MultiPropertySelector from "@/components/MultiPropertySelector";
import { resolveImageSrc } from "@/utils/image";

interface PropertyApplicabilitySelectorProps {
  appliesToAllEntities: boolean;
  setAppliesToAllEntities: (value: boolean) => void;
  entityIds: string[];
  setEntityIds: React.Dispatch<React.SetStateAction<string[]>>;
  preloadedEntities: any[];
  startTransition: (callback: () => void) => void;
  brandId?: string;
  error?: string | null;
  title?: string;
}

export default function PropertyApplicabilitySelector({
  appliesToAllEntities,
  setAppliesToAllEntities,
  entityIds,
  setEntityIds,
  preloadedEntities,
  startTransition,
  error,
  title = "Property Applicability",
}: PropertyApplicabilitySelectorProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingMode, setPendingMode] = useState<"all" | "specific" | null>(null);
  const [selectedEntitiesData, setSelectedEntitiesData] = useState<any[]>([]);

  const allEntityData = useMemo(() => {
    const preloadedMap = new Map(preloadedEntities.map((e) => [e.id, e]));
    selectedEntitiesData.forEach((e) => {
      if (!preloadedMap.has(e.id)) preloadedMap.set(e.id, e);
    });
    return Array.from(preloadedMap.values());
  }, [preloadedEntities, selectedEntitiesData]);

  const includedEntities = useMemo(
    () => allEntityData.filter((e) => entityIds.includes(e.id)),
    [entityIds, allEntityData],
  );

  const excludedEntityIds = useMemo(() => {
    if (!appliesToAllEntities) return [];
    return allEntityData.filter((e) => !entityIds.includes(e.id)).map((e) => e.id);
  }, [appliesToAllEntities, entityIds, allEntityData]);

  const excludedEntities = useMemo(() => {
    if (!appliesToAllEntities) return [];
    return allEntityData.filter((e) => excludedEntityIds.includes(e.id));
  }, [excludedEntityIds, allEntityData]);

  const performModeSwitch = (mode: "all" | "specific") => {
    if (mode === "all") {
      setAppliesToAllEntities(true);
      setEntityIds(preloadedEntities.map((e) => e.id));
    } else {
      setAppliesToAllEntities(false);
      setEntityIds([]);
    }
    setShowConfirmModal(false);
    setPendingMode(null);
  };

  const handleModeSwitch = (mode: "all" | "specific") => {
    if (mode === "all" && !appliesToAllEntities) {
      if (entityIds.length > 0) {
        setPendingMode("all");
        setShowConfirmModal(true);
      } else {
        performModeSwitch("all");
      }
    } else if (mode === "specific" && appliesToAllEntities) {
      if (entityIds.length < preloadedEntities.length) {
        setPendingMode("specific");
        setShowConfirmModal(true);
      } else {
        performModeSwitch("specific");
      }
    }
  };

  const addInclusion = (entityId: string, entity?: any) => {
    setEntityIds((prev) => (prev.includes(entityId) ? prev : [...prev, entityId]));
    if (entity) {
      setSelectedEntitiesData((prev) => (prev.find((e) => e.id === entity.id) ? prev : [...prev, entity]));
    }
  };

  const removeInclusion = (entityId: string) => {
    setEntityIds((prev) => prev.filter((id) => id !== entityId));
  };

  const renderEntityCard = (entity: any, action: () => void, isDestructive: boolean) => {
    const gallery = entity.gallery || entity.galleries;
    const imageUrl = resolveImageSrc(gallery?.[0]?.url) ?? "https://placehold.co/100x100?text=No+Image";
    const city = typeof entity.city === "string" ? entity.city : entity.city?.city;
    const state = typeof entity.state === "string" ? entity.state : entity.state?.state;
    const locationText = [city, state].filter(Boolean).join(", ");

    return (
      <div key={entity.id} className="flex items-center p-2 border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
        <div className="relative w-10 h-10 rounded overflow-hidden mr-3 bg-gray-100 dark:bg-gray-700 flex-shrink-0">
          <img src={imageUrl} alt={entity.propertyName || entity.entityName} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-900 truncate dark:text-white">{entity.propertyName || entity.entityName || entity.name}</p>
          <p className="text-xs text-gray-500 truncate flex items-center gap-1 dark:text-gray-400">
            <HiLocationMarker className="w-3 h-3" />
            {locationText || "Unknown Location"}
          </p>
        </div>
        <button type="button" onClick={action} className={`p-2 rounded-full transition-colors ${isDestructive ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
          <HiTrash className="w-5 h-5" />
        </button>
      </div>
    );
  };

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3 dark:text-white">{title}</h3>
      <div className="bg-gray-100 p-1 rounded-lg flex mb-4 dark:bg-gray-700">
        <div
          onClick={() => handleModeSwitch("all")}
          className={`flex-1 text-center py-2 rounded-md text-sm font-medium cursor-pointer transition-all ${
            appliesToAllEntities
              ? "bg-blue-600 text-white shadow"
              : "text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-white"
          }`}
        >
          All Properties
        </div>
        <div
          onClick={() => handleModeSwitch("specific")}
          className={`flex-1 text-center py-2 rounded-md text-sm font-medium cursor-pointer transition-all ${
            !appliesToAllEntities
              ? "bg-blue-600 text-white shadow"
              : "text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-white"
          }`}
        >
          Specific Properties
        </div>
      </div>

      {error && <p className="mb-2 text-sm text-red-600 dark:text-red-500">{error}</p>}
      <div className="mb-4 space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {appliesToAllEntities
            ? "This will apply to all properties. You can specifically exclude properties below."
            : `This is currently valid on ${entityIds.length} properties.`}
        </p>
        <div className="relative">
          <MultiPropertySelector
            entityIds={appliesToAllEntities ? excludedEntityIds : entityIds}
            update={(id: string, add: boolean, entity?: any) => {
              if (appliesToAllEntities) {
                if (add) removeInclusion(id);
                else addInclusion(id, entity);
              } else {
                if (add) addInclusion(id, entity);
                else removeInclusion(id);
              }
            }}
            placeholder={
              appliesToAllEntities
                ? "Search and select properties to exclude them"
                : "Search and select properties to include them"
            }
          />
        </div>
      </div>

      {appliesToAllEntities ? (
        <div>
          {excludedEntities.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-red-600 dark:text-red-500">Except these properties (Exclusion List):</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {excludedEntities.map((entity) => renderEntityCard(entity, () => addInclusion(entity.id, entity), true))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {includedEntities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {includedEntities.map((entity) => renderEntityCard(entity, () => removeInclusion(entity.id), true))}
            </div>
          ) : (
            <div className="text-sm text-gray-400 italic p-4 text-center border border-dashed rounded-lg dark:border-gray-700">
              No properties selected. Use search to add.
            </div>
          )}
        </div>
      )}

      <Modal show={showConfirmModal} size="md" popup onClose={() => setShowConfirmModal(false)}>
        <ModalHeader />
        <ModalBody>
          <div className="text-center">
            <HiExclamation className="mx-auto mb-4 h-14 w-14 text-gray-400 dark:text-gray-200" />
            <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">Change Scope?</h3>
            <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
              {pendingMode === "all"
                ? `Switching to 'All Properties' will clear your selection of ${entityIds.length} properties.`
                : `Switching to 'Specific Properties' will clear your ${preloadedEntities.length - entityIds.length} exclusions.`}
              <br />
              Are you sure?
            </p>
            <div className="flex justify-center gap-4">
              <Button color="failure" onClick={() => pendingMode && performModeSwitch(pendingMode)}>
                Confirm & Clear
              </Button>
              <Button color="gray" onClick={() => setShowConfirmModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </ModalBody>
      </Modal>
    </div>
  );
}
