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
