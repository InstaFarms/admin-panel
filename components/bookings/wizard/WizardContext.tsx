"use client";

import { createContext, useContext } from "react";
import type {
  WizardBrand,
  WizardCommissionSource,
  WizardState,
} from "./types";

export type WizardToast = (message: string) => void;

export type WizardCtxValue = {
  s: WizardState;
  patch: (p: Partial<WizardState>) => void;
  brands: WizardBrand[];
  commissionSources: WizardCommissionSource[];
  brandAppType: string | undefined;
  toast: WizardToast;
  goNext: () => void;
  goBack: () => void;
  goTo: (step: number) => void;
  doCreate: () => void;
  submitting: boolean;
};

export const WizardContext = createContext<WizardCtxValue | null>(null);

export function useWizard(): WizardCtxValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within CreateBookingWizard");
  return ctx;
}

export function money(n: number | null | undefined): string {
  const v = Math.round(n || 0);
  return `₹${v.toLocaleString("en-IN")}`;
}

export function moneyCompact(n: number | null | undefined): string {
  const v = Math.round(n || 0);
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}k`;
  return `₹${v}`;
}

/**
 * The backend requires a real `commissionBookingSourceId` (a row from the
 * admin-managed Source & Commission list) on every booking -- there's no
 * fixed enum for it. The wizard's simplified source cards (Direct / Owner
 * Referral / Third Party Travel Agent / OTA) have to resolve to one of
 * those real records by name/code, since there's no other link between them.
 * Returns "" if nothing configured matches -- callers must treat that as
 * "can't submit yet", not silently drop the field.
 */
export function resolveCommissionSourceId(sources: WizardCommissionSource[], keywords: string[]): string {
  for (const kw of keywords) {
    const hit = sources.find((s) => s.sourceName?.toLowerCase().includes(kw) || s.sourceCode?.toLowerCase().includes(kw));
    if (hit) return hit.id;
  }
  return "";
}
