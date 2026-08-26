import { HiTrash, HiLocationMarker, HiExclamation } from "react-icons/hi";
import { useState, useMemo } from "react";

import { Label, Modal, Button, ModalHeader, ModalBody } from "flowbite-react";

import MultiEntitySelector from "@/components/MultiEntitySelector";
import { resolveImageSrc } from "@/utils/image";

interface EntityApplicabilitySelectorProps {
  appliesToAllEntities: boolean;
  setAppliesToAllEntities: (value: boolean) => void;
  entityIds: string[];
  setEntityIds: React.Dispatch<React.SetStateAction<string[]>>;
  preloadedEntities: any[];
  startTransition: (callback: () => void) => void;
  error?: string | null;
  title?: string;
  brandId?: string;
  appType?: string;
  allowExclusions?: boolean;
}

export default function EntityApplicabilitySelector({
  appliesToAllEntities,
  setAppliesToAllEntities,
  entityIds,
  setEntityIds,
  preloadedEntities,
  startTransition,
  error,
  title = "Property Applicability",
  brandId,
  appType,
  allowExclusions = true,
}: EntityApplicabilitySelectorProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingMode, setPendingMode] = useState<"all" | "specific" | null>(
    null,
  );
  const [selectedEntitiesData, setSelectedEntitiesData] = useState<any[]>([]);
  const [showExclusionSearch, setShowExclusionSearch] = useState(false);

  // Combine preloaded and dynamically fetched entity data
  const allEntityData = useMemo(() => {
    const preloadedMap = new Map(preloadedEntities.map((e) => [e.id, e]));
    selectedEntitiesData.forEach((e) => {
      if (!preloadedMap.has(e.id)) {
        preloadedMap.set(e.id, e);
      }
    });
    return Array.from(preloadedMap.values());
  }, [preloadedEntities, selectedEntitiesData]);

  const includedEntities = useMemo(() => {
    return allEntityData.filter((e) => entityIds.includes(e.id));
  }, [entityIds, allEntityData]);

  const excludedEntityIds = useMemo(() => {
    if (!appliesToAllEntities) return [];
    // For "All Entities" mode, exclusions are those NOT in the entityIds whitelist
    return allEntityData
      .filter((e) => !entityIds.includes(e.id))
      .map((e) => e.id);
  }, [appliesToAllEntities, entityIds, allEntityData]);

  const excludedEntities = useMemo(() => {
    if (!appliesToAllEntities) return [];
    return allEntityData.filter((e) => excludedEntityIds.includes(e.id));
  }, [excludedEntityIds, allEntityData]);

  const performModeSwitch = (mode: "all" | "specific") => {
    if (mode === "all") {
      setAppliesToAllEntities(true);
      // Default whitelist for "All Entities" contains ALL preloaded entities
      setEntityIds(preloadedEntities.map((e) => e.id));
      setShowExclusionSearch(false);
    } else {
      setAppliesToAllEntities(false);
      setEntityIds([]);
      setShowExclusionSearch(true);
    }
    setShowConfirmModal(false);
    setPendingMode(null);
  };

  const removeAllProperties = () => {
    setAppliesToAllEntities(false);
    setEntityIds([]);
    setShowExclusionSearch(true);
  };

  const handleModeSwitch = (mode: "all" | "specific") => {
    if (mode === "all" && !appliesToAllEntities) {
      // Switching Specific -> All
      if (entityIds.length > 0) {
        setPendingMode("all");
        setShowConfirmModal(true);
      } else {
        performModeSwitch("all");
      }
    } else if (mode === "specific" && appliesToAllEntities) {
      // Switching All -> Specific
      if (entityIds.length < preloadedEntities.length) {
        setPendingMode("specific");
        setShowConfirmModal(true);
      } else {
        performModeSwitch("specific");
      }
    }
  };

  const addInclusion = (entityId: string, entity?: any) => {
    setEntityIds((prev) => {
      if (prev.includes(entityId)) return prev;
      return [...prev, entityId];
    });
    if (entity) {
      setSelectedEntitiesData((prev) => {
        if (prev.find((e) => e.id === entity.id)) return prev;
        return [...prev, entity];
      });
    }
  };

  const removeInclusion = (entityId: string) => {
    setEntityIds((prev) => prev.filter((id) => id !== entityId));
  };

  const renderEntityCard = (
    entity: any,
    action: () => void,
    isDestructive: boolean,
  ) => {
    const gallery = entity.gallery || entity.galleries;
    const imageUrl =
      resolveImageSrc(gallery?.[0]?.url) ?? "https://placehold.co/100x100?text=No+Image";
    const city =
      typeof entity.city === "string" ? entity.city : entity.city?.city;
    const state =
      typeof entity.state === "string" ? entity.state : entity.state?.state;
    const locationText = [city, state].filter(Boolean).join(", ");

    return (
      <div
        key={entity.id}
        className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2.5 transition-colors hover:border-gray-300 hover:shadow-sm dark:border-slate-700/70 dark:bg-slate-800/60 dark:hover:border-slate-600 dark:hover:bg-slate-800"
      >
        <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-slate-700">
          <img
            src={imageUrl}
            alt={entity.propertyName || entity.entityName}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {entity.propertyName || entity.entityName || entity.name}
          </p>
          <p className="flex items-center gap-1 truncate text-xs text-gray-500 dark:text-slate-400">
            <HiLocationMarker className="h-3 w-3 flex-shrink-0" />
            {locationText || "Unknown Location"}
          </p>
        </div>
        <button
          type="button"
          onClick={action}
          title={isDestructive ? "Remove" : "Include"}
          className={`flex-shrink-0 rounded-full p-2 opacity-70 transition-colors group-hover:opacity-100 ${isDestructive ? "text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300" : "text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"}`}
        >
          <HiTrash className="h-4 w-4" />
        </button>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
            Control which properties this offer can be applied to.
          </p>
        </div>
        <button
          type="button"
          onClick={removeAllProperties}
          disabled={!appliesToAllEntities && entityIds.length === 0}
          className="flex items-center justify-center gap-1.5 self-start rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:bg-transparent disabled:hover:text-gray-500 sm:self-auto dark:border-slate-700 dark:text-slate-400 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-400 dark:disabled:hover:border-slate-700 dark:disabled:hover:text-slate-400"
        >
          <HiTrash className="h-3.5 w-3.5" />
          Remove All Properties
        </button>
      </div>

      {/* Segmented Control */}
      <div className="mb-4 flex rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-slate-700/70 dark:bg-slate-800/60">
        <div
          onClick={() => handleModeSwitch("all")}
          className={`flex-1 cursor-pointer rounded-md py-2 text-center text-sm font-medium transition-all ${
            appliesToAllEntities
              ? "bg-primary-600 text-white shadow"
              : "text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
          }`}
        >
          All Properties
        </div>
        <div
          onClick={() => handleModeSwitch("specific")}
          className={`flex-1 cursor-pointer rounded-md py-2 text-center text-sm font-medium transition-all ${
            !appliesToAllEntities
              ? "bg-primary-600 text-white shadow"
              : "text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
          }`}
        >
          Specific Properties
        </div>
      </div>

      {error && (
        <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Sub-text and Search */}
      <div className="mb-4 space-y-3">
        {appliesToAllEntities ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700/70 dark:bg-slate-800/40">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Applies to every property
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  {!allowExclusions
                    ? "This plan will be available for all properties."
                    : excludedEntityIds.length > 0
                      ? `${excludedEntityIds.length} properties are excluded.`
                      : "No property selection is needed for this scope."}
                </p>
              </div>
              {allowExclusions && (
                <button
                  type="button"
                  onClick={() => setShowExclusionSearch((value) => !value)}
                  className="self-start rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 sm:self-auto dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700"
                >
                  {showExclusionSearch || excludedEntityIds.length > 0
                    ? "Edit Exclusions"
                    : "Exclude Properties"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-slate-400">
            This is currently valid on{" "}
            <span className="font-medium text-gray-800 dark:text-slate-200">{entityIds.length}</span>{" "}
            {entityIds.length === 1 ? "property" : "properties"}.
          </p>
        )}

        {(!appliesToAllEntities ||
          (allowExclusions &&
            (showExclusionSearch || excludedEntityIds.length > 0))) && (
          <div className="relative">
            <MultiEntitySelector
              entityIds={appliesToAllEntities ? excludedEntityIds : entityIds}
              brandId={brandId}
              appType={appType}
              update={(id: string, add: boolean, entity?: any) => {
                if (appliesToAllEntities) {
                  // Checking the box means EXCLUDING the entity (removing from entityIds whitelist)
                  if (add) removeInclusion(id);
                  else addInclusion(id, entity);
                } else {
                  // Checking the box means INCLUDING the entity (adding to entityIds whitelist)
                  if (add) addInclusion(id, entity);
                  else removeInclusion(id);
                }
              }}
              placeholder={
                appliesToAllEntities
                  ? "Search properties to exclude"
                  : "Search and select properties to include them"
              }
            />
          </div>
        )}
      </div>

      {/* The List */}
      {appliesToAllEntities && allowExclusions ? (
        <div>
          {excludedEntities.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-xs font-semibold tracking-wide text-red-600 uppercase dark:text-red-400">
                  Excluded properties
                </Label>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {excludedEntities.map((entity) =>
                  renderEntityCard(
                    entity,
                    () => addInclusion(entity.id, entity),
                    true,
                  ),
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {includedEntities.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {includedEntities.map((entity) =>
                renderEntityCard(
                  entity,
                  () => removeInclusion(entity.id),
                  true,
                ),
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400">
              No properties selected yet. Use the search above to add some.
            </div>
          )}
        </div>
      )}

      <Modal
        show={showConfirmModal}
        size="md"
        popup
        onClose={() => setShowConfirmModal(false)}
      >
        <ModalHeader />
        <ModalBody>
          <div className="text-center">
            <HiExclamation className="mx-auto mb-4 h-14 w-14 text-amber-500 dark:text-amber-400" />
            <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              Change Scope?
            </h3>
            <p className="mb-5 text-sm text-gray-500 dark:text-slate-400">
              {pendingMode === "all"
                ? `Switching to 'All Properties' will clear your selection of ${entityIds.length} properties.`
                : `Switching to 'Specific Properties' will clear your ${preloadedEntities.length - entityIds.length} exclusions.`}
              <br />
              Are you sure?
            </p>
            <div className="flex justify-center gap-3">
              <Button
                color="failure"
                onClick={() => pendingMode && performModeSwitch(pendingMode)}
              >
                Confirm &amp; Clear
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
