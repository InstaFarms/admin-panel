"use client";

import { usePropertyBootstrap } from "./usePropertyBootstrap";
import { usePropertyServices } from "./usePropertyServices";

export function usePropertyHook(propertyId?: string | null) {
  const bootstrap = usePropertyBootstrap(propertyId);
  const services = usePropertyServices(propertyId);
  return { ...bootstrap, ...services };
}

export type PropertyEditorDataServices = ReturnType<typeof usePropertyHook>;
