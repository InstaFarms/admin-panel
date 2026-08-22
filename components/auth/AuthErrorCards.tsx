"use client";

/**
 * Auth error card components used by AuthErrorHandler.
 * Each renders a specific error state (expired, access denied, generic) with a primary action.
 */
import { Button } from "flowbite-react";

/** Session expired: countdown message + spinner + "Login Now" button. */
export function ExpiredSessionCard({
  countdown,
  isRedirecting,
  onLoginNow,
}: {
  countdown: number;
  isRedirecting: boolean;
  onLoginNow: () => void;
}) {
  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-700/50 dark:bg-yellow-900/20">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 shadow-lg">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="space-y-2 text-center">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              Session Expired
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your session has expired. Redirecting to login in {countdown}{" "}
              second{countdown !== 1 ? "s" : ""}...
            </p>
          </div>
          {isRedirecting && (
            <div className="flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-yellow-600" />
            </div>
          )}
        </div>
      </div>
      <Button color="yellow" size="sm" onClick={onLoginNow} className="w-full">
        Login Now
      </Button>
    </div>
  );
}

/** Access denied: non-admin account message + "Return to Login" button. */
export function AccessDeniedCard({ onReturnToLogin }: { onReturnToLogin: () => void }) {
  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-700/50 dark:bg-red-900/20">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="space-y-2 text-center">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              Access Denied
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This account does not have admin privileges.
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              If you believe this is an error, please contact your administrator.
            </p>
          </div>
        </div>
      </div>
      <Button color="gray" size="sm" onClick={onReturnToLogin} className="w-full">
        Return to Login
      </Button>
    </div>
  );
}

/** Generic error: message + "Return to Login" button. */
export function DefaultErrorView({
  message,
  onReturnToLogin,
}: {
  message: string;
  onReturnToLogin: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
      <Button color="blue" size="sm" onClick={onReturnToLogin} className="w-full">
        Return to Login
      </Button>
    </div>
  );
}
