"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAdminEditorForm } from "@/hooks/useAdminEditorForm";
import type { Admin } from "@/utils/types";

type AdminEditorFormValue = ReturnType<typeof useAdminEditorForm> & {
  /** Derived, display-ready snapshot of the form for the live-preview hero. */
  preview: {
    fullName: string;
    email: string;
    phoneNumber: string;
    whatsappNumber: string;
    panelRoleLabel: string;
    gender: string;
    /** 0-100, share of tracked fields that have a value. */
    completenessPct: number;
  };
};

const AdminEditorFormContext = createContext<AdminEditorFormValue | null>(null);

/**
 * Owns the single `useAdminEditorForm` instance for a create/edit admin page so
 * the server-component page header's submit button and the client editor form
 * read the exact same state (one hook instance, no prop drilling through the
 * server boundary).
 */
export function AdminEditorFormProvider({
  adminId,
  initialAdmin,
  canManageRole,
  children,
}: {
  adminId?: string;
  initialAdmin?: Admin | null;
  canManageRole: boolean;
  children: ReactNode;
}) {
  const form = useAdminEditorForm(adminId, { canManageRole, initialAdmin });

  const {
    firstName,
    lastName,
    email,
    phoneNumber,
    whatsappNumber,
    panelRole,
    gender,
    addressFields,
  } = form;

  const value = useMemo<AdminEditorFormValue>(() => {
    const tracked = [
      firstName,
      lastName,
      email,
      phoneNumber,
      whatsappNumber,
      gender,
      addressFields.line1,
      addressFields.city,
      addressFields.state,
      addressFields.country,
      addressFields.pincode,
    ];
    const filled = tracked.filter((v) => v && v.trim().length > 0).length;
    const completenessPct = Math.round((filled / tracked.length) * 100);

    return {
      ...form,
      preview: {
        fullName: [firstName, lastName].filter(Boolean).join(" ").trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        whatsappNumber: whatsappNumber.trim(),
        panelRoleLabel: panelRole.replaceAll("_", " "),
        gender,
        completenessPct,
      },
    };
  }, [
    form,
    firstName,
    lastName,
    email,
    phoneNumber,
    whatsappNumber,
    panelRole,
    gender,
    addressFields,
  ]);

  return (
    <AdminEditorFormContext.Provider value={value}>
      {children}
    </AdminEditorFormContext.Provider>
  );
}

export function useAdminEditorFormContext(): AdminEditorFormValue {
  const ctx = useContext(AdminEditorFormContext);
  if (!ctx) {
    throw new Error(
      "useAdminEditorFormContext must be used inside <AdminEditorFormProvider>",
    );
  }
  return ctx;
}
