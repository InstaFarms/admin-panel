"use server";

import { revalidatePath } from "next/cache";

import { isAdmin } from "@/utils/admin-only";
// Removed BookingConfirmationService import - using API routes instead
import { apiPost, apiGet } from "@/utils/api-utils";
import { cookies } from "next/headers";
import { captureError } from "@/lib/sentry";

// Helper function to get Firebase token from cookies
async function getAuthToken(): Promise<string> {
    const cookieStore = await cookies();
    const token = cookieStore.get("jarvis-admin-token")?.value;

    if (!token) {
        throw new Error("No authentication token found");
    }

    return token;
}

export async function approveBookingConfirmation(id: string) {
    const admin = await isAdmin();
    if (!admin) {
        throw new Error("Unauthorized");
    }

    try {
        const token = await getAuthToken();

        console.log(`[Admin Panel] Approving booking confirmation via API: /api/booking/admin/confirmations/approve/${id}`);

        const result = await apiPost(`/api/booking/admin/confirmations/approve/${id}`, {}, { token });

        if (!result.success) {
            throw new Error(result.message || 'Failed to approve booking confirmation');
        }

        console.log(`[Admin Panel] ✅ Booking confirmation approved successfully: ${id}`);

        revalidatePath("/admin/bookings/approval-queue");
        revalidatePath("/admin/bookings/booking-requests");
        revalidatePath(`/admin/bookings/booking-requests/${id}`);
        revalidatePath("/admin/bookings");
    } catch (error) {
        console.error("Error approving booking confirmation:", error);
        captureError(error);
        throw error;
    }
}

export async function rejectBookingConfirmation(id: string, reason: string) {
    const admin = await isAdmin();
    if (!admin) {
        throw new Error("Unauthorized");
    }

    try {
        const token = await getAuthToken();

        console.log(`[Admin Panel] Rejecting booking confirmation via API: /api/booking/admin/confirmations/reject/${id}`);

        const result = await apiPost(`/api/booking/admin/confirmations/reject/${id}`, { reason }, { token });

        if (!result.success) {
            throw new Error(result.message || 'Failed to reject booking confirmation');
        }

        console.log(`[Admin Panel] ✅ Booking confirmation rejected successfully: ${id}`);

        revalidatePath("/admin/bookings/approval-queue");
        revalidatePath("/admin/bookings/booking-requests");
        revalidatePath(`/admin/bookings/booking-requests/${id}`);
        revalidatePath("/admin/bookings");
    } catch (error) {
        console.error("Error rejecting booking confirmation:", error);
        captureError(error);
        throw error;
    }
}

export async function getPendingBookingConfirmationCount() {
    try {
        const token = await getAuthToken();

        const result = await apiGet("/api/booking/admin/confirmations/pending/count", { token });

        if (!result.success) {
            throw new Error(result.message || 'Failed to fetch pending confirmation count');
        }

        return result.data?.count || 0;
    } catch (error) {
        console.error("Error fetching pending booking confirmation count:", error);
        captureError(error);
        return 0;
    }
}

export async function getPendingBookingConfirmations() {
    const admin = await isAdmin();
    if (!admin) {
        throw new Error("Unauthorized");
    }

    try {
        const token = await getAuthToken();

        const result = await apiPost("/api/booking/admin/confirmations/pending", {
            pageNumber: 1,
            perPage: 100,
        }, { token });

        if (!result.success) {
            throw new Error(result.message || 'Failed to fetch pending confirmations');
        }

        // Transform API result to match UI component expectations
        const confirmations = result.data || [];
        return confirmations.map((item: any) => ({
            id: item.bookingId,
            requestedAt: item.requestedAt || item.booking?.updatedAt || item.booking?.createdAt,
            guestName: item.customer ? `${item.customer.firstName} ${item.customer.lastName || ''}` : 'Unknown Guest',
            propertyName: item.property?.propertyName || 'Unknown Property',
            checkinDate: item.booking?.checkinDate,
            checkoutDate: item.booking?.checkoutDate,
            guestCount: (item.booking?.adultCount || 0) + (item.booking?.childrenCount || 0) + (item.booking?.infantCount || 0),
        }));

    } catch (error) {
        console.error("Error fetching pending booking confirmations:", error);
        captureError(error);
        throw error;
    }
}

export async function getPastBookingConfirmations() {
    const admin = await isAdmin();
    if (!admin) {
        throw new Error("Unauthorized");
    }

    try {
        // Past confirmation history is deprecated after removing bookingConfirmations table.
        return [];
    } catch (error) {
        console.error("Error fetching past bookings:", error);
        captureError(error);
        throw error;
    }
}

export async function getBookingConfirmationById(id: string) {
    const admin = await isAdmin();
    if (!admin) {
        throw new Error("Unauthorized");
    }

    try {
        const token = await getAuthToken();
        const result = await apiGet(`/api/booking/admin/${id}`, { token });

        if (!result.success || !result.data) {
            return null;
        }

        const payload = result.data;
        const bookingRecord = payload.booking?.booking || payload.booking || null;
        const customer = payload.booking?.customer || null;
        const cancellation = payload.booking?.cancellation || null;
        const property = payload.booking?.property || null;
        if (!bookingRecord) return null;

        return {
            id: bookingRecord.id,
            bookingId: bookingRecord.id,
            status: bookingRecord.status,
            requestedAt: bookingRecord.updatedAt || bookingRecord.createdAt,
            confirmedAt: bookingRecord.status === "CONFIRMED" ? (bookingRecord.updatedAt || bookingRecord.createdAt) : undefined,
            rejectedAt: bookingRecord.status === "REJECTED" ? (bookingRecord.updatedAt || bookingRecord.createdAt) : undefined,
            rejectionReason: bookingRecord.status === "REJECTED" ? "Rejected by admin" : undefined,
            actionTakenBy: bookingRecord.adminUpdatedBy ? "Admin" : "System",
            guestName: customer ? `${customer.firstName} ${customer.lastName || ''}` : 'Unknown Guest',
            propertyName: property?.propertyName || "Unknown Property",
            customer,
            booking: bookingRecord,
            refundStatus: cancellation?.refundStatus,
            refundAmount: cancellation?.refundAmount,
            refundError: cancellation?.refundError,
            razorpayRefundId: cancellation?.razorpayRefundId,
            paymentId: payload.payments?.[0]?.razorpayPaymentId,
        };

    } catch (error) {
        console.error(`Error fetching booking confirmation ${id}:`, error);
        captureError(error);
        throw error;
    }
}
