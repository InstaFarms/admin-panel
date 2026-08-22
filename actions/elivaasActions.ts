"use server";

import { isAdmin } from "@/utils/admin-only";
import { apiGet, apiPost, apiPut, apiPatch } from "@/utils/api-utils";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  if (!token) throw new Error("No authentication token found");
  return token;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ElivaasCity {
  name: string;
  displayName: string;
  slug: string;
  type: "CITY" | "STATE";
  numberOfProperties: number | null;
}

export interface ElivaasQuote {
  quoteId: string | null;
  id?: string;
  resolvedQuoteId?: string;
  propertyId: string;
  ratePlanId: string;
  ratePlanCode: string;
  ratePlanName: string | null;
  ratePlanDTO?: { displayName?: string };
  propertyName: string;
  checkinDate: string;
  checkoutDate: string;
  numberOfNights: number;
  adults: number;
  children: number;
  originalNetAmountAfterTax: number;
  netAmountBeforeTax: number;
  netAmountAfterTax: number;
  netPerNightAmountAfterTax: number;
  gstAmount: number;
  securityDeposit: number | null;
  soldOut: boolean;
}

export interface ElivaasProperty {
  id: string;
  name: string;
  soldOut: boolean;
  quotes: ElivaasQuote[];
}

export interface ElivaasPropertySettings {
  propertyId: string;
  isVisible: boolean;
  isDeletedFromElivaas: boolean;
  deletedFromElivaasAt: string | null;
  markupPercentage: number;
  displayNameOverride: string | null;
  adminNotes: string | null;
  descriptionOverride: string | null;
  imagesOverride: string | null;
  maxGuestsOverride: number | null;
  bedroomCountOverride: number | null;
  bathroomCountOverride: number | null;
  bedsCountOverride: number | null;
  amenitiesOverride: string | null;
  checkInTimeOverride: string | null;
  checkOutTimeOverride: string | null;
  houseRulesOverride: string | null;
  tagsOverride: string | null;
  faqsOverride: string | null;
  spacesOverride: string | null;
  sectionsOverride: string | null;
  priceAmountOverride: number | null;
  securityDepositOverride: number | null;
  extraAdultRateOverride: number | null;
  extraChildRateOverride: number | null;
  areaOverride: string | null;
  latOverride: string | null;
  lngOverride: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ElivaasPropertyCatalog {
  propertyId: string;
  name: string;
  city: string;
  lastSyncedAt: string;
  _settings?: ElivaasPropertySettings | null;
}

export type FieldChange = { field: string; displayOld: string | null; displayNew: string | null; newValue: string | number | null };

export interface ElivaasPropertyDiff {
  newProperties:     { propertyId: string; name: string; city: string; citySlug?: string; description?: string | null; imageCount?: number | null; amenityCount?: number | null; maxOccupancy?: number | null; firstImageUrl?: string | null }[];
  nameChanges:       { propertyId: string; oldName: string; newName: string; city: string; citySlug?: string; fieldChanges: FieldChange[] }[];
  removedProperties: { propertyId: string; name: string; city: string }[];
  unchanged: number;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function getElvaasCatalogCities(): Promise<{ city: string; citySlug: string; state: string; stateSlug: string }[]> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    const token = await getAuthToken();
    const res = await apiGet<{ success: boolean; data: any[] }>(
      "/api/elivaas/catalog/cities", { token }
    );
    return (res.data ?? []).map((c: any) => ({
      city:      (c.city_name ?? c.name ?? c.city ?? "") as string,
      citySlug:  (c.city_slug ?? "") as string,
      state:     (c.state ?? "") as string,
      stateSlug: (c.state_slug ?? "") as string,
    }));
  } catch { return []; }
}

export async function getElvaasCities(): Promise<ElivaasCity[]> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    const token = await getAuthToken();
    const res = await apiGet<{ success: boolean; data: ElivaasCity[] }>(
      "/api/elivaas/cities", { token }
    );
    return res.data ?? [];
  } catch (e: any) {
    return [];
  }
}

export async function getElivaasPropertyCatalog(): Promise<ElivaasPropertyCatalog[]> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    const token = await getAuthToken();
    const res = await apiGet<{ success: boolean; data: ElivaasPropertyCatalog[] }>(
      "/api/elivaas/catalog", { token }
    );
    return res.data ?? [];
  } catch (e: any) {
    console.error("[Elivaas] getCatalog failed:", e?.message);
    return [];
  }
}

export async function forceFullSyncElivaas(): Promise<
  { success: true; totalUpserted: number } | { success: false; message: string }
> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    const token = await getAuthToken();
    const res = await apiPost<{
      success: boolean;
      data?: { totalUpserted: number; syncedAt: string };
      message?: string;
    }>("/api/elivaas/sync", {}, { token });
    revalidatePath("/admin/elivaas");
    return res.success
      ? { success: true, totalUpserted: res.data?.totalUpserted ?? 0 }
      : { success: false, message: res.message ?? "Sync failed" };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function syncPreviewElivaas(): Promise<
  { success: true; data: ElivaasPropertyDiff } | { success: false; message: string }
> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    const token = await getAuthToken();
    const res = await apiGet<{ success: boolean; data: ElivaasPropertyDiff }>(
      "/api/elivaas/sync/preview", { token }
    );
    return res.success
      ? { success: true, data: res.data }
      : { success: false, message: "Preview failed" };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function syncApplyElivaas(params: {
  toUpsert: { propertyId: string; name: string; city: string; citySlug?: string; description?: string | null; imageCount?: number | null; amenityCount?: number | null; maxOccupancy?: number | null; lat?: string | null; lng?: string | null; firstImageUrl?: string | null }[];
  toRemove: string[];
}): Promise<{ success: boolean; upserted?: number; removed?: number; message?: string }> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    const token = await getAuthToken();
    const res = await apiPost<{
      success: boolean;
      data?: { upserted: number; removed: number; appliedAt: string };
      message?: string;
    }>("/api/elivaas/sync/apply", params, { token });
    revalidatePath("/admin/elivaas");
    return res.success
      ? { success: true, ...res.data }
      : { success: false, message: res.message };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function getElivaasPropertySettings(): Promise<ElivaasPropertySettings[]> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    const token = await getAuthToken();
    const res = await apiGet<{ success: boolean; data: ElivaasPropertySettings[] }>(
      "/api/elivaas/settings", { token }
    );
    return res.data ?? [];
  } catch (e: any) {
    return [];
  }
}

export async function updateElivaasPropertySetting(
  propertyId: string,
  updates: Partial<Omit<ElivaasPropertySettings, "propertyId" | "createdAt" | "updatedAt">>
): Promise<{ success: boolean }> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    const token = await getAuthToken();
    const res = await apiPut<{ success: boolean }>(
      `/api/elivaas/settings/${propertyId}`,
      updates,
      { token }
    );
    if (!res.success) return { success: false };
    revalidatePath("/admin/elivaas");

    return { success: true };
  } catch (e: any) {
    console.error("[Elivaas] updateSetting failed:", e?.message);
    return { success: false };
  }
}

export async function getElivaasQuote(params: {
  propertyId: string;
  ratePlanCode: string;
  checkinDate: string;
  checkoutDate: string;
  adults?: number;
  children?: number;
}): Promise<{ quote: ElivaasQuote | null; error?: string }> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    const token = await getAuthToken();
    const qs = new URLSearchParams({
      propertyId:   params.propertyId,
      ratePlanCode: params.ratePlanCode,
      checkinDate:  params.checkinDate,
      checkoutDate: params.checkoutDate,
    });
    if (params.adults)   qs.set("adults",   String(params.adults));
    if (params.children) qs.set("children", String(params.children));
    qs.set("quantity", "1");
    const res = await apiGet<{
      success: boolean;
      data: { list: Array<{ quotes: ElivaasQuote[] }> };
    }>(`/api/elivaas/quote?${qs.toString()}`, { token });
    return { quote: res.data?.list?.[0]?.quotes?.[0] ?? null };
  } catch (e: any) {
    return { quote: null, error: e.message };
  }
}

export interface ElivaasBookingRecord {
  id: string;
  elivaasBookingId: string | null;
  propertyId: string;
  propertyName: string | null;
  checkinDate: string;
  checkoutDate: string;
  nights: number | null;
  adults: number | null;
  children: number | null;
  ratePlanName: string | null;
  amountAfterTax: number | null;
  guestFirstName: string | null;
  guestLastName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  paymentStatus: string | null;
  retryCount: number | null;
  nextRetryAt: string | null;
  createdAt: string;
}

export async function getElvaasCanelCount(): Promise<number> {
  try {
    const admin = await isAdmin();
    if (!admin) return 0;
    const token = await getAuthToken();
    const res = await apiGet<{ success: boolean; data: ElivaasBookingRecord[] }>(
      "/api/elivaas/bookings", { token }
    );
    return (res.data ?? []).filter((b: any) => b.status === "CANCELLATION_REQUESTED").length;
  } catch {
    return 0;
  }
}

export async function getElivaasBookings(): Promise<ElivaasBookingRecord[]> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    const token = await getAuthToken();
    const res = await apiGet<{ success: boolean; data: ElivaasBookingRecord[] }>(
      "/api/elivaas/bookings", { token }
    );
    return res.data ?? [];
  } catch (e: any) {
    console.error("[Elivaas] getBookings failed:", e?.message);
    return [];
  }
}

// ─── Booking lifecycle types ──────────────────────────────────────────────────

export type ElivaasBookingStatus = "CONFIRMED" | "CANCELLATION_REQUESTED" | "CANCELLED" | "COMPLETED";
export type ElvCancellationType  = "CUSTOMER_CANCELLED" | "OWNER_CANCELLED" | "ADMIN_CANCELLED" | "NO_SHOW";
export type ElivaasRefundStatus  = "NOT_APPLICABLE" | "PENDING" | "COMPLETED";

export interface ElivaasBookingFull extends ElivaasBookingRecord {
  status:                  ElivaasBookingStatus;
  cancellationType:        ElvCancellationType | null;
  cancellationNote:        string | null;
  cancellationRequestedAt: string | null;
  cancelledAt:             string | null;
  refundStatus:            ElivaasRefundStatus;
  refundAmount:            number | null;
  adminNotes:              string | null;
}

export async function getElivaasBooking(id: string): Promise<ElivaasBookingFull | null> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    const token = await getAuthToken();
    const res = await apiGet<{ success: boolean; data: ElivaasBookingFull }>(
      `/api/elivaas/bookings/${id}`, { token }
    );
    return res.data ?? null;
  } catch {
    return null;
  }
}

export async function updateElivaasBooking(
  id: string,
  updates: Partial<Pick<ElivaasBookingFull,
    "status" | "cancellationType" | "cancellationNote" |
    "refundStatus" | "refundAmount" | "adminNotes"
  >>
): Promise<{ success: boolean; message?: string }> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    const token = await getAuthToken();
    await apiPatch<{ success: boolean }>(
      `/api/elivaas/bookings/${id}`, updates, { token }
    );
    revalidatePath(`/admin/elivaas/bookings/${id}`);
    revalidatePath("/admin/elivaas/bookings");
    return { success: true };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function createElivaasBooking(formData: FormData) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");
  const token = await getAuthToken();

  const propertyId   = formData.get("propertyId")   as string;
  const ratePlanCode = formData.get("ratePlanCode")  as string;
  const checkinDate  = formData.get("checkinDate")   as string;
  const checkoutDate = formData.get("checkoutDate")  as string;
  const adults       = Number(formData.get("adults")    || 1);
  const children     = Number(formData.get("children")  || 0);
  const guestFirst   = (formData.get("firstName") as string)?.trim();
  const guestLast    = (formData.get("lastName")  as string)?.trim();
  const guestEmail   = (formData.get("email")     as string)?.trim();
  const guestPhone   = (formData.get("phone")     as string)?.trim();

  if (!guestFirst || !guestLast || !guestEmail || !guestPhone) {
    redirect(`/admin/elivaas?error=All guest fields are required`);
  }

  const qs = new URLSearchParams({
    propertyId, ratePlanCode, checkinDate, checkoutDate,
    adults: String(adults), children: String(children), quantity: "1",
  });
  const quoteRes = await apiGet<{
    success: boolean;
    data: { list: Array<{ quotes: Array<{ resolvedQuoteId?: string; quoteId?: string | null; id?: string }> }> };
  }>(`/api/elivaas/quote?${qs.toString()}`, { token });

  const rawQuote = quoteRes.data?.list?.[0]?.quotes?.[0];
  const quoteId  = rawQuote?.resolvedQuoteId ?? rawQuote?.quoteId ?? rawQuote?.id ?? "";

  if (!quoteId) {
    redirect(`/admin/elivaas?error=Could not fetch quote — property may be unavailable`);
  }

  const propertyName = formData.get("propertyName") as string | null;
  const ratePlanName = formData.get("ratePlanName") as string | null;
  const nights = Math.round((new Date(checkoutDate).getTime() - new Date(checkinDate).getTime()) / 86400000);
  const rawAmount = rawQuote as any;
  const amountAfterTax = rawAmount?.netAmountAfterTax ? Math.round(rawAmount.netAmountAfterTax) : undefined;

  const res = await apiPost<{ success: boolean; data?: { bookingId?: string } }>(
    "/api/elivaas/booking/admin",
    {
      quoteId,
      propertyId,
      propertyName:   propertyName ?? undefined,
      checkinDate,
      checkoutDate,
      nights,
      adults,
      children,
      ratePlanName:   ratePlanName ?? undefined,
      amountAfterTax,
      guest: {
        email:     guestEmail,
        phone:     guestPhone.startsWith("+") ? guestPhone : `+91${guestPhone.slice(-10)}`,
        firstName: guestFirst,
        lastName:  guestLast,
      },
    },
    { token }
  );

  const confirmedId = (res as any)?.data?.bookingId ?? "—";
  redirect(`/admin/elivaas?success=Booking+confirmed%21+ID%3A+${confirmedId}`);
}

export async function getBackfillStatus(): Promise<{ total: number; done: number }> {
  try {
    const admin = await isAdmin();
    if (!admin) return { total: 0, done: 0 };
    const token = await getAuthToken();
    const res = await apiGet<{ success: boolean; data: { total: number; done: number } }>(
      "/api/elivaas/settings/backfill/status", { token }
    );
    return res.data ?? { total: 0, done: 0 };
  } catch { return { total: 0, done: 0 }; }
}

export async function backfillElivaasSettings(): Promise<{ success: boolean; imported?: number; total?: number; message?: string }> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    const token = await getAuthToken();
    const res = await apiPost<{ success: boolean; data?: { imported: number; total: number }; message?: string }>(
      "/api/elivaas/settings/backfill", {}, { token }
    );
    if (res.success) revalidatePath("/admin/elivaas");
    return res.success
      ? { success: true, imported: res.data?.imported, total: res.data?.total }
      : { success: false, message: res.message ?? "Backfill failed" };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function restoreElivaasProperty(propertyId: string): Promise<{ success: boolean }> {
  return updateElivaasPropertySetting(propertyId, {
    isVisible: true,
    isDeletedFromElivaas: false,
    deletedFromElivaasAt: null,
  });
}

// ─── City state overrides ─────────────────────────────────────────────────────

export interface ElvaasCitySetting {
  citySlug: string;
  cityName: string;
  stateOverride: string | null;
  stateSlugOverride: string | null;
}

export async function getElvaasCitySettings(): Promise<ElvaasCitySetting[]> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    const token = await getAuthToken();
    const res = await apiGet<{ success: boolean; data: ElvaasCitySetting[] }>(
      "/api/elivaas/city-settings", { token }
    );
    return res.data ?? [];
  } catch { return []; }
}

export async function updateElvaasCityState(
  citySlug: string,
  cityName: string,
  stateOverride: string | null
): Promise<{ success: boolean }> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    const token = await getAuthToken();
    const res = await apiPut<{ success: boolean }>(
      `/api/elivaas/city-settings/${encodeURIComponent(citySlug)}`,
      { cityName, stateOverride },
      { token }
    );
    if (!res.success) return { success: false };
    revalidatePath("/admin/elivaas");

    return { success: true };
  } catch (e: any) {
    return { success: false };
  }
}

export async function retryElivaasBooking(id: string): Promise<{ success: boolean; attempt?: number; message?: string }> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    const token = await getAuthToken();
    const res = await apiPost<{ success: boolean; data?: { attempt: number; isFinal?: boolean }; message?: string }>(
      `/api/elivaas/bookings/${id}/retry`, {}, { token }
    );
    revalidatePath(`/admin/elivaas/bookings/${id}`);
    revalidatePath("/admin/elivaas/bookings");
    return res.success
      ? { success: true, attempt: res.data?.attempt }
      : { success: false, message: res.message };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}
