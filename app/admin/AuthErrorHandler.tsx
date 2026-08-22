"use client";

/**
 * AuthErrorHandler: shown when admin layout rejects access (no token or not admin).
 * Renders different UIs for "session expired" (countdown + auto redirect), "access denied"
 * (non-admin), or a generic error. All branches offer a logout/return-to-login action.
 * Card UIs live in @/components/auth/AuthErrorCards.tsx.
 */
import { clearAuthCookie } from "@/actions/loginActions";
import {
  AccessDeniedCard,
  DefaultErrorView,
  ExpiredSessionCard,
} from "@/components/auth/AuthErrorCards";
import { useCallback, useEffect, useState } from "react";
import Cookies from "js-cookie";

const COUNTDOWN_SECONDS = 3;
const ERROR_MATCH_EXPIRED = "expired";
const ERROR_MATCH_NO_ADMIN = "not have admin access";
const DEFAULT_ERROR_MESSAGE = "An authentication error occurred";

const COOKIE_OPTIONS = { path: "/" as const };

interface AuthErrorHandlerProps {
  errorMessage?: string;
}

export default function AuthErrorHandler({ errorMessage }: AuthErrorHandlerProps) {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleLogout = useCallback(async () => {
    try {
      await clearAuthCookie();
      Cookies.remove("jarvis-admin-token", COOKIE_OPTIONS);
      Cookies.remove("adminDocumentId", COOKIE_OPTIONS);
      localStorage.removeItem("admin-user-info");
      window.location.href = "/";
    } catch (error) {
      console.error("[AuthErrorHandler] Logout error:", error);
      Cookies.remove("jarvis-admin-token", COOKIE_OPTIONS);
      Cookies.remove("adminDocumentId", COOKIE_OPTIONS);
      window.location.href = "/";
    }
  }, []);

  const isExpired = Boolean(
    errorMessage?.toLowerCase().includes(ERROR_MATCH_EXPIRED)
  );
  const isNoAdmin = Boolean(
    errorMessage?.toLowerCase().includes(ERROR_MATCH_NO_ADMIN)
  );

  // Auto-redirect when session expired: countdown then logout
  useEffect(() => {
    if (!isExpired) return;

    setIsRedirecting(true);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isExpired, handleLogout]);

  if (isExpired) {
    return (
      <ExpiredSessionCard
        countdown={countdown}
        isRedirecting={isRedirecting}
        onLoginNow={handleLogout}
      />
    );
  }

  if (isNoAdmin) {
    return <AccessDeniedCard onReturnToLogin={handleLogout} />;
  }

  return (
    <DefaultErrorView
      message={errorMessage ?? DEFAULT_ERROR_MESSAGE}
      onReturnToLogin={handleLogout}
    />
  );
}
