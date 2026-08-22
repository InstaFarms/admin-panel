"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

export default function SentryExamplePage() {
  const [hasFrontendError, setHasFrontendError] = useState(false);
  const [apiStatus, setApiStatus] = useState<string | null>(null);

  if (hasFrontendError) {
    throw new Error("Sentry Frontend Test Error");
  }

  async function triggerApiError() {
    setApiStatus("sending...");
    try {
      const res = await fetch("/api/sentry-example-api");
      const data = await res.json();
      setApiStatus(data.error ? `error sent: ${data.error}` : "done");
    } catch {
      setApiStatus("request failed");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold">Sentry Test Page</h1>
      <p className="text-gray-500 text-sm">
        Use the buttons below to send test events to Sentry.
      </p>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <button
          onClick={() => setHasFrontendError(true)}
          className="rounded-lg bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700"
        >
          Throw Frontend Error
        </button>

        <button
          onClick={triggerApiError}
          className="rounded-lg bg-orange-500 px-4 py-2 text-white font-medium hover:bg-orange-600"
        >
          Trigger API Error
        </button>

        <button
          onClick={() => {
            Sentry.captureMessage("Manual test message from admin panel");
            setApiStatus("message sent to Sentry");
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700"
        >
          Send Test Message
        </button>
      </div>

      {apiStatus && (
        <p className="text-sm text-gray-600 mt-2">{apiStatus}</p>
      )}
    </div>
  );
}
