"use server";

import { cookies } from "next/headers";
import { apiGet, apiPost, apiPut } from "@/utils/api-utils";

async function getToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  if (!token) throw new Error("No authentication token found");
  return token;
}

// ─── Types (mirror if-api routes/sleeping-slots.ts) ───────────────────────────

export interface SleepingSlot {
  id: string;
  slotLabel: string;
  displayOrder: number;
  basePricePerNight: number;
  isActive: boolean;
}

export interface SleepingSlotBed {
  id: string;
  bedType: "SINGLE" | "DOUBLE";
  displayOrder: number;
  isActive: boolean;
  slots: SleepingSlot[];
}

export interface SleepingSlotRoom {
  id: string;
  roomName: string;
  displayOrder: number;
  isActive: boolean;
  beds: SleepingSlotBed[];
}

export interface SleepingSlotConfig {
  enabled: boolean;
  rooms: SleepingSlotRoom[];
}

export interface BookingSlotAssignment {
  slotId: string;
  slotLabel: string;
  bedType: "SINGLE" | "DOUBLE";
  roomId: string;
  roomName: string;
  guestGender: "MALE" | "FEMALE";
}

export interface BookingSlotAssignments {
  bookingId: string;
  maleGuestCount: number | null;
  femaleGuestCount: number | null;
  assignments: BookingSlotAssignment[];
}

// Occupancy view reuses the customer layout shape (availability + genders).
export interface OccupancySlot {
  id: string;
  slotLabel: string;
  displayOrder: number;
  basePricePerNight: number;
  available: boolean;
  occupantGender: "MALE" | "FEMALE" | null;
}
export interface OccupancyBed {
  id: string;
  bedType: "SINGLE" | "DOUBLE";
  displayOrder: number;
  slots: OccupancySlot[];
}
export interface OccupancyRoom {
  id: string;
  roomName: string;
  displayOrder: number;
  genderState: "EMPTY" | "MALE_OCCUPIED" | "FEMALE_PRESENT";
  beds: OccupancyBed[];
}
export interface OccupancyLayout {
  propertyId: string;
  checkinDate: string;
  checkoutDate: string;
  rooms: OccupancyRoom[];
}

export interface CreateSleepingSlotRoomInput {
  roomName: string;
  displayOrder?: number;
  beds: Array<{
    bedType: "SINGLE" | "DOUBLE";
    displayOrder?: number;
    slots: Array<{
      slotLabel: string;
      displayOrder?: number;
      basePricePerNight: number;
    }>;
  }>;
}

export interface UpdateSleepingSlotRoomInput {
  roomName?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateSleepingSlotInput {
  slotLabel?: string;
  displayOrder?: number;
  basePricePerNight?: number;
  isActive?: boolean;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function getSleepingSlotConfig(
  propertyId: string
): Promise<{ data: SleepingSlotConfig | null; error?: string }> {
  try {
    const token = await getToken();
    const res = await apiGet<{ success: boolean; data: SleepingSlotConfig }>(
      `/api/properties/${propertyId}/sleeping-slots/config`,
      { token }
    );
    return { data: res.data ?? { enabled: false, rooms: [] } };
  } catch (err: any) {
    return { data: null, error: err?.message || "Failed to load sleeping-slot config" };
  }
}

export async function setSleepingSlotEnabled(
  propertyId: string,
  enabled: boolean
): Promise<{ error?: string }> {
  try {
    const token = await getToken();
    await apiPut(
      `/api/properties/${propertyId}/sleeping-slots/enabled`,
      { enabled },
      { token }
    );
    return {};
  } catch (err: any) {
    return { error: err?.message || "Failed to update bed-wise booking flag" };
  }
}

export async function createSleepingSlotRoom(
  propertyId: string,
  input: CreateSleepingSlotRoomInput
): Promise<{ error?: string }> {
  try {
    const token = await getToken();
    await apiPost(
      `/api/properties/${propertyId}/sleeping-slots/rooms`,
      input,
      { token }
    );
    return {};
  } catch (err: any) {
    return { error: err?.message || "Failed to create room" };
  }
}

export async function updateSleepingSlotRoom(
  propertyId: string,
  roomId: string,
  input: UpdateSleepingSlotRoomInput
): Promise<{ error?: string }> {
  try {
    const token = await getToken();
    await apiPut(
      `/api/properties/${propertyId}/sleeping-slots/rooms/${roomId}`,
      input,
      { token }
    );
    return {};
  } catch (err: any) {
    return { error: err?.message || "Failed to update room" };
  }
}

export async function updateSleepingSlot(
  propertyId: string,
  slotId: string,
  input: UpdateSleepingSlotInput
): Promise<{ error?: string }> {
  try {
    const token = await getToken();
    await apiPut(
      `/api/properties/${propertyId}/sleeping-slots/slots/${slotId}`,
      input,
      { token }
    );
    return {};
  } catch (err: any) {
    return { error: err?.message || "Failed to update slot" };
  }
}

export async function getBookingSlotAssignments(
  propertyId: string,
  bookingId: string
): Promise<{ data: BookingSlotAssignments | null; error?: string }> {
  try {
    const token = await getToken();
    const res = await apiGet<{ success: boolean; data: BookingSlotAssignments }>(
      `/api/properties/${propertyId}/sleeping-slots/bookings/${bookingId}`,
      { token }
    );
    return { data: res.data ?? null };
  } catch (err: any) {
    // 404 = this booking simply isn't a bed-wise booking; treat as "no data".
    if (typeof err?.message === "string" && err.message.includes("404")) {
      return { data: null };
    }
    return { data: null, error: err?.message || "Failed to load bed assignments" };
  }
}

export async function getSleepingSlotOccupancy(
  propertyId: string,
  startdate: string,
  enddate: string
): Promise<{ data: OccupancyLayout | null; error?: string }> {
  try {
    const token = await getToken();
    const res = await apiGet<{ success: boolean; data: OccupancyLayout }>(
      `/api/properties/${propertyId}/sleeping-slots/occupancy?startdate=${startdate}&enddate=${enddate}`,
      { token }
    );
    return { data: res.data ?? null };
  } catch (err: any) {
    return { data: null, error: err?.message || "Failed to load occupancy" };
  }
}
