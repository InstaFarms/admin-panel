"use server";

import { cookies } from "next/headers";

import { isAdmin } from "@/utils/admin-only";
import { apiGet, apiPost } from "@/utils/api-utils";

export type PropertyInvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "CANCELLED";

export type PropertyInvoice = {
  id: string;
  invoiceNumber: string;
  propertyId: string;
  ownerId: string;
  ownerName: string | null;
  ownerEmail: string | null;
  month: string;
  status: PropertyInvoiceStatus;
  totalBookingRevenue: number;
  totalPositiveAdjustments: number;
  totalNegativeAdjustments: number;
  totalNotionalRevenue: number;
  totalCommission: number;
  totalCommissionGst: number;
  totalTds: number;
  totalExpenses: number;
  milestoneAdjustmentAmount: number;
  ownerNetPayable: number;
  platformNetEarning: number;
  totalOwnerBlockRentExclGst: number;
  totalOwnerBlockRentGst: number;
  totalOwnerBlockRentNights: number;
  issuedAt: string | null;
  dueDate: string | null;
  paidAt: string | null;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type MonthEndTerms = {
  id: string;
  propertyId: string;
  month: string;
  milestoneSetupId: string | null;
  status: "OPEN" | "CLOSED" | "ADJUSTED";
  provisionalCommissionRate: number | null;
  finalCommissionRate: number | null;
  provisionalMilestoneNumber: number | null;
  finalMilestoneNumber: number | null;
  revenueWithGst: number;
  revenueWithoutGst: number;
  commissionableBaseTotal: number;
  commissionCharged: number;
  commissionGstCharged: number;
  commissionAdjustment: number;
  commissionGstAdjustment: number;
  ownerCreditAmount: number;
  closedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CurrentPropertyInvoiceResponse = {
  month: string;
  invoice: PropertyInvoice | null;
  monthEndTerms: MonthEndTerms | null;
};

export type PropertyInvoiceHistoryResponse = {
  invoices: PropertyInvoice[];
  monthEndTerms: MonthEndTerms[];
};

export type InvoiceExpenseReadiness = {
  ready: boolean;
  missingCategories: Array<{ id: string; name: string }>;
  monthlyExpenseId: string | null;
};

async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  if (!token) throw new Error("Unauthorized");
  return token;
}

export async function getCurrentPropertyInvoice(
  propertyId: string,
  month?: string,
) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");

  const token = await getAuthToken();
  const query = month ? `?month=${encodeURIComponent(month)}` : "";
  const response = await apiGet<{ data: CurrentPropertyInvoiceResponse }>(
    `/api/admin/properties/${propertyId}/current-property-invoice${query}`,
    { token },
  );

  return response.data ?? { month: "", invoice: null, monthEndTerms: null };
}

export async function checkPropertyInvoiceExpenseReadiness(
  propertyId: string,
  month?: string,
) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");

  const token = await getAuthToken();
  const query = month ? `?month=${encodeURIComponent(month)}` : "";
  const response = await apiGet<{ data: InvoiceExpenseReadiness }>(
    `/api/admin/properties/${propertyId}/invoice-expense-readiness${query}`,
    { token },
  );

  return response.data;
}

export async function getPropertyInvoiceHistory(propertyId: string) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");

  const token = await getAuthToken();
  const response = await apiGet<{ data: PropertyInvoiceHistoryResponse }>(
    `/api/admin/properties/${propertyId}/invoices`,
    { token },
  );

  return response.data ?? { invoices: [], monthEndTerms: [] };
}

export async function generatePropertyInvoice(
  propertyId: string,
  month?: string,
) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");

  const token = await getAuthToken();
  const response = await apiPost<{
    success?: boolean;
    data?: { invoice?: PropertyInvoice; monthEndTerms?: MonthEndTerms | null };
    message?: string;
  }>(
    `/api/admin/properties/${propertyId}/generate-property-invoice`,
    { month },
    { token },
  );

  if (response.success === false) {
    throw new Error(response.message || "Failed to generate invoice");
  }

  return response.data;
}
