"use client";

import type { UsePropertyServicesReturn } from "@/hooks/properties/usePropertyServices";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";

interface PropertyEditorServicesContextValue {
  services: UsePropertyServicesReturn;
  bootstrapLoading: boolean;
}

const PropertyEditorServicesContext =
  createContext<PropertyEditorServicesContextValue | null>(null);

export function PropertyEditorServicesProvider({
  value,
  children,
}: {
  value: PropertyEditorServicesContextValue;
  children: ReactNode;
}) {
  return (
    <PropertyEditorServicesContext.Provider value={value}>
      {children}
    </PropertyEditorServicesContext.Provider>
  );
}

export function usePropertyEditorServicesContext() {
  const context = useContext(PropertyEditorServicesContext);
  if (!context) {
    throw new Error(
      "usePropertyEditorServicesContext must be used inside PropertyEditorServicesProvider",
    );
  }
  return context;
}
