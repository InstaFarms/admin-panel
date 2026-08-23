"use client";

import ICalManagement from "@/components/properties/ICalManagement";
import { usePropertyEditorServicesContext } from "@/components/properties/editor/usePropertyEditorServicesContext";
import { useEffect } from "react";

interface ICalTabContainerProps {
  propertyId?: string | null;
  isResort?: boolean;
  resortRooms?: any[];
}

export default function ICalTabContainer({
  propertyId,
  isResort,
  resortRooms,
}: ICalTabContainerProps) {
  const { services } = usePropertyEditorServicesContext();
  const { ensureIcalLoaded } = services;

  useEffect(() => {
    void ensureIcalLoaded();
  }, [ensureIcalLoaded]);

  return (
    <ICalManagement
      propertyId={propertyId}
      isResort={isResort}
      resortRooms={resortRooms}
      icalLinks={services.icalLinks}
      showAddForm={services.showAddForm}
      setShowAddForm={services.setShowAddForm}
      newLink={services.newLink}
      setNewLink={services.setNewLink}
      exportUrl={services.exportUrl}
      icalLoading={services.icalLoading || services.icalBootstrapLoading}
      handleAddIcalLink={services.handleAddIcalLink}
      handleSyncIcalLink={services.handleSyncIcalLink}
      handleDeleteIcalLink={services.handleDeleteIcalLink}
      handleCopyExportUrl={services.handleCopyExportUrl}
    />
  );
}

