"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { apiPost } from "@/utils/api-utils";
import { captureError } from "@/lib/sentry";

export const revalidateAfterLogin = async () => {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
};

export const sendOTP = async (phoneNumber: string) => {
  try {
    const response = await apiPost<{ success: boolean; message?: string; error?: string }>("/api/auth/send-otp", { phoneNumber });

    const sendOtpMsg = response.success
      ? `[Auth] sendOTP → success, OTP sent to user. -> ${phoneNumber}`
      : `[Auth] sendOTP → failed: ${response.error || response.message || "Unknown error"}`;
    console.log(sendOtpMsg);

    if (!response.success) {
      const errorMsg = response.error || response.message || 'Failed to send OTP';
      
      // Check for admin not found error
      if (errorMsg.toLowerCase().includes('not found') || 
          errorMsg.toLowerCase().includes('not an admin') ||
          errorMsg.toLowerCase().includes('no admin')) {
        return {
          success: false,
          message: 'This phone number is not registered as an admin. Please contact your administrator.',
          isAdminError: true,
        };
      }
      
      return {
        success: false,
        message: errorMsg,
      };
    }

    return {
      success: true,
      message: response.message || 'OTP sent successfully',
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Auth] sendOTP → error: ${errMsg}`);
    captureError(error);

    // Check if it's a network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        message: 'Unable to connect to server. Please check your internet connection.',
      };
    }
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send OTP. Please try again.',
    };
  }
};

export const verifyOTPAndLogin = async (phoneNumber: string, otp: string) => {
  try {
    const response = await apiPost<{
      success: boolean;
      accessToken?: string;
      documentId?: string;
      deviceToken?: string;
      data?: { admin: any };
      message?: string;
      error?: string;
      isAdmin?: boolean;
    }>("/api/auth/verify-otp", { phoneNumber, otp });

    const verifyMsg = response.success
      ? "[Auth] verifyOTP → token valid, setting session."
      : `[Auth] verifyOTP → failed: ${response.error || response.message || "Invalid or unauthorized"}`;
    console.log(verifyMsg);

    if (!response.success) {
      const errorMsg = response.error || response.message || 'Invalid OTP or not authorized';
      
      // Detect non-admin user errors
      if (response.isAdmin === false || 
          errorMsg.toLowerCase().includes('not an admin') || 
          errorMsg.toLowerCase().includes('not authorized') ||
          errorMsg.toLowerCase().includes('no admin access')) {
        return {
          success: false,
          message: 'Access Denied: This account does not have admin privileges.',
          isAdminError: true,
        };
      }
      
      // Invalid OTP
      if (errorMsg.toLowerCase().includes('invalid') || 
          errorMsg.toLowerCase().includes('incorrect') ||
          errorMsg.toLowerCase().includes('wrong')) {
        return {
          success: false,
          message: 'Invalid OTP. Please check and try again.',
        };
      }
      
      // OTP expired
      if (errorMsg.toLowerCase().includes('expired')) {
        return {
          success: false,
          message: 'OTP has expired. Please request a new one.',
        };
      }
      
      return {
        success: false,
        message: errorMsg,
      };
    }

    const result = response;
    const cookieStore = await cookies();

    if (result.accessToken) {
      cookieStore.set('jarvis-admin-token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30
      });
    }

    if (result.documentId) {
      cookieStore.set('adminDocumentId', result.documentId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30
      });
    }

    // Trusted-device token: only issued to eligible panel roles (SUPER_ADMIN today -
    // see auth.ts DEVICE_LOGIN_ELIGIBLE_ROLES). Lets deviceLogin() below skip
    // phone+OTP entirely on this browser's next visit.
    if (result.accessToken) {
      cookieStore.set('jarvis-device-token', result.deviceToken ?? '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: result.deviceToken ? 60 * 60 * 24 * 30 : 0,
      });
    }

    if (result.accessToken || result.documentId) {
      console.log("[Auth] verifyOTP → session cookies set successfully.");
    }

    // No revalidatePath call here, on purpose: this action runs while the
    // login page is still mounted, and *any* revalidatePath call inside a
    // server action makes Next.js send back refreshed flight data for the
    // CURRENT route as part of the action's response - regardless of which
    // path string was passed in. That refresh re-renders the root layout
    // mid-flow and can unmount+remount this page, wiping the in-progress
    // OTP/"Verified" step state back to the phone step. The client does a
    // hard `window.location.href` redirect right after this resolves, which
    // already guarantees a fully fresh render for /admin - no revalidation
    // needed here.

    return {
      success: true,
      accessToken: result.accessToken,
      documentId: result.documentId,
      admin: result.data?.admin,
      message: 'Login successful',
      needsRefresh: true,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Auth] verifyOTP → unexpected error: ${errMsg}`);
    captureError(error);

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        message: 'Unable to connect to server. Please check your internet connection.',
      };
    }
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify OTP. Please try again.',
    };
  }
};

/**
 * Trusted-device silent login: exchanges the `jarvis-device-token` cookie (only ever
 * set for eligible panel roles - see verifyOTPAndLogin) for a fresh session, with no
 * phone number or OTP. Called once on the login page's mount, before the phone form
 * renders, so a recognized device skips straight to the dashboard.
 *
 * Fails silently and clears the cookie on any rejection (missing/expired/revoked/
 * network error) - the phone+OTP form is always the fallback, and a failed silent
 * attempt shouldn't surface as an error to the user.
 */
export const deviceLogin = async () => {
  const cookieStore = await cookies();
  const deviceToken = cookieStore.get("jarvis-device-token")?.value;

  if (!deviceToken) {
    return { success: false as const };
  }

  try {
    const response = await apiPost<{
      success: boolean;
      accessToken?: string;
      documentId?: string;
      deviceToken?: string;
      data?: { admin: any };
      error?: string;
    }>("/api/auth/device-login", { deviceToken });

    if (!response.success || !response.accessToken) {
      cookieStore.delete("jarvis-device-token");
      return { success: false as const };
    }

    cookieStore.set("jarvis-admin-token", response.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    if (response.documentId) {
      cookieStore.set("adminDocumentId", response.documentId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    // Rotated by the backend on every use - swap in the new secret.
    cookieStore.set("jarvis-device-token", response.deviceToken ?? "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: response.deviceToken ? 60 * 60 * 24 * 30 : 0,
    });

    console.log("[Auth] deviceLogin → silent session established.");

    return {
      success: true as const,
      admin: response.data?.admin,
    };
  } catch (error) {
    console.error(
      `[Auth] deviceLogin → rejected: ${error instanceof Error ? error.message : String(error)}`
    );
    cookieStore.delete("jarvis-device-token");
    return { success: false as const };
  }
};

export const checkAuthCookie = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  const docId = cookieStore.get("adminDocumentId")?.value;

  if (!token) {
    return {
      hasToken: false,
      hasDocId: false,
      tokenPreview: null,
    };
  }
  
  return { 
    hasToken: !!token,
    hasDocId: !!docId,
    tokenPreview: token?.substring(0, 20) 
  };
};

export const clearAuthCookie = async () => {
  const cookieStore = await cookies();
  const adminDocumentId = cookieStore.get("adminDocumentId")?.value;
  const deviceToken = cookieStore.get("jarvis-device-token")?.value;
  const token = cookieStore.get("jarvis-admin-token")?.value;

  if (adminDocumentId && token) {
    try {
      // Explicit logout revokes this browser's trusted-device token too - it
      // shouldn't silently sign back in after the user chose to sign out.
      await apiPost(
        "/api/auth/logout",
        deviceToken ? { deviceToken } : {},
        { token }
      );
    } catch (error) {
      console.error(
        `[Auth] clearAuthCookie -> failed to record logout directly: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      captureError(error);
    }
  }

  revalidatePath("/admin/admins");
  if (adminDocumentId) {
    revalidatePath(`/admin/admins/${adminDocumentId}`);
  }

  cookieStore.delete("jarvis-admin-token");
  cookieStore.delete("adminDocumentId");
  cookieStore.delete("jarvis-device-token");
  console.log("[Auth] clearAuthCookie → session cookies cleared.");
};
