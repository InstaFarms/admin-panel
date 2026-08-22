"use server";

import { cookies } from "next/headers";
import { apiGet, apiPost, apiPatch, apiDelete, apiPut } from "@/utils/api-utils";

async function getToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  if (!token) throw new Error("No authentication token found");
  return token;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResortRoom {
  id: string;
  propertyId: string;
  roomNumber: string;
  roomName: string;
  roomType: string;
  bedroomCount: number;
  bathroomCount: number;
  baseGuestCount: number;
  maxGuestCount: number;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  brandMappings?: ResortRoomBrandMapping[];
}

export interface ResortRoomBrandMapping {
  id: string;
  roomId: string;
  brandId: string;
  brandName?: string;
  isActive: boolean;
  weight: number;
}

export interface ResortRoomPricingRule {
  id?: string;
  dayOfWeek: string;
  basePrice?: number | null;
  basePriceWithGst?: number | null;
  adultExtraGuestCharge?: number | null;
  adultExtraGuestChargeWithGst?: number | null;
  childExtraGuestCharge?: number | null;
  childExtraGuestChargeWithGst?: number | null;
  infantExtraGuestCharge?: number | null;
  infantExtraGuestChargeWithGst?: number | null;
  baseGuestCount?: number | null;
  discount?: number | null;
  gstSlab?: number | null;
  maxTotal?: number | null;
}

export interface ResortRoomAmenity {
  id: string;
  name: string;
  icon: string;
  isPaid: boolean;
  isUSP: boolean;
  weight: number;
}

export interface ResortRoomPhoto {
  id?: string;
  photoId?: string;
  originalUrl: string;
  altText?: string | null;
  sortOrder?: number;
  isFeatured?: boolean;
}

export interface ResortRoomContent {
  amenities: ResortRoomAmenity[];
  photos: ResortRoomPhoto[];
}

export interface CreateResortRoomInput {
  brandId: string;
  roomNumber: string;
  roomName: string;
  roomType: string;
  bedroomCount?: number;
  bathroomCount?: number;
  baseGuestCount?: number;
  maxGuestCount: number;
  description?: string | null;
  sortOrder?: number;
}

export interface UpdateResortRoomInput {
  roomNumber?: string;
  roomName?: string;
  roomType?: string;
  bedroomCount?: number;
  bathroomCount?: number;
  baseGuestCount?: number;
  maxGuestCount?: number;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/** List all rooms for a resort property */
export async function listResortRooms(
  propertyId: string,
  brandId: string
): Promise<{ data: ResortRoom[] | null; error?: string }> {
  try {
    const token = await getToken();
    const res = await apiGet<{ success: boolean; data: ResortRoom[] }>(
      `/api/properties/${propertyId}/rooms?brandId=${encodeURIComponent(brandId)}`,
      { token }
    );
    return { data: res.data ?? [] };
  } catch (err: any) {
    return { data: null, error: err?.message || "Failed to load rooms" };
  }
}

/** Create a new room for a resort property */
export async function createResortRoom(
  propertyId: string,
  input: CreateResortRoomInput
): Promise<{ data: ResortRoom | null; error?: string }> {
  try {
    const token = await getToken();
    const res = await apiPost<{ success: boolean; data: ResortRoom }>(
      `/api/properties/${propertyId}/rooms`,
      input,
      { token }
    );
    return { data: res.data ?? null };
  } catch (err: any) {
    return { data: null, error: err?.message || "Failed to create room" };
  }
}

/** Update a room */
export async function updateResortRoom(
  propertyId: string,
  roomId: string,
  brandId: string,
  input: UpdateResortRoomInput
): Promise<{ data: ResortRoom | null; error?: string }> {
  try {
    const token = await getToken();
    const res = await apiPatch<{ success: boolean; data: ResortRoom }>(
      `/api/properties/${propertyId}/rooms/${roomId}`,
      { ...input, brandId },
      { token }
    );
    return { data: res.data ?? null };
  } catch (err: any) {
    return { data: null, error: err?.message || "Failed to update room" };
  }
}

/** Soft-delete a room (sets isActive = false) */
export async function deleteResortRoom(
  propertyId: string,
  roomId: string,
  brandId: string
): Promise<{ error?: string }> {
  try {
    const token = await getToken();
    await apiDelete(
      `/api/properties/${propertyId}/rooms/${roomId}?brandId=${encodeURIComponent(brandId)}`,
      { token }
    );
    return {};
  } catch (err: any) {
    return { error: err?.message || "Failed to delete room" };
  }
}

/** Get day-wise pricing for a room */
export async function getResortRoomPricing(
  propertyId: string,
  roomId: string,
  brandId: string
): Promise<{ data: ResortRoomPricingRule[] | null; error?: string }> {
  try {
    const token = await getToken();
    const res = await apiGet<{
      success: boolean;
      data: ResortRoomPricingRule[];
    }>(
      `/api/properties/${propertyId}/rooms/${roomId}/pricing?brandId=${encodeURIComponent(brandId)}`,
      { token }
    );
    return { data: res.data ?? [] };
  } catch (err: any) {
    return { data: null, error: err?.message || "Failed to load pricing" };
  }
}

/** Get room-specific amenities and photos for the selected brand. */
export async function getResortRoomContent(
  propertyId: string,
  roomId: string,
  brandId: string
): Promise<{ data: ResortRoomContent | null; error?: string }> {
  try {
    const token = await getToken();
    const res = await apiGet<{ success: boolean; data: ResortRoomContent }>(
      `/api/properties/${propertyId}/rooms/${roomId}/content?brandId=${encodeURIComponent(brandId)}`,
      { token }
    );
    return { data: res.data ?? { amenities: [], photos: [] } };
  } catch (err: any) {
    return { data: null, error: err?.message || "Failed to load room content" };
  }
}

/** Replace room-specific amenities and the selected brand's room gallery. */
export async function saveResortRoomContent(
  propertyId: string,
  roomId: string,
  input: {
    brandId: string;
    amenityIds: string[];
    photos: Array<{
      photoId?: string;
      originalUrl?: string;
      altText?: string | null;
      isFeatured?: boolean;
    }>;
  }
): Promise<{ data: ResortRoomContent | null; error?: string }> {
  try {
    const token = await getToken();
    const res = await apiPut<{ success: boolean; data: ResortRoomContent }>(
      `/api/properties/${propertyId}/rooms/${roomId}/content`,
      input,
      { token }
    );
    return { data: res.data ?? null };
  } catch (err: any) {
    return { data: null, error: err?.message || "Failed to save room content" };
  }
}

/** Save all 7 day-of-week pricing rows for a room */
export async function saveResortRoomPricing(
  propertyId: string,
  roomId: string,
  brandId: string,
  rows: ResortRoomPricingRule[]
): Promise<{ error?: string }> {
  try {
    const token = await getToken();
    await apiPut(
      `/api/properties/${propertyId}/rooms/${roomId}/pricing`,
      { brandId, rules: rows },
      { token }
    );
    return {};
  } catch (err: any) {
    return { error: err?.message || "Failed to save pricing" };
  }
}

/**
 * Returns resort room list if the property is a Resort, or null if it isn't.
 * Used by blocking + booking forms to conditionally show a room selector.
 */
export async function getPropertyResortRooms(
  propertyId: string,
  brandId: string
): Promise<{ rooms: ResortRoom[] | null; error?: string }> {
  try {
    const token = await getToken();
    const res = await apiGet<{ success: boolean; data: ResortRoom[] }>(
      `/api/properties/${propertyId}/rooms?brandId=${encodeURIComponent(brandId)}`,
      { token }
    );
    return { rooms: res.data ?? [] };
  } catch (err: any) {
    const msg: string = err?.message ?? "";
    // If the API returns 404 / 400 (property is not a resort) treat it as non-resort
    if (msg.includes("404") || msg.includes("400") || msg.includes("not a Resort")) {
      return { rooms: null };
    }
    return { rooms: null, error: msg || "Failed to check resort rooms" };
  }
}
