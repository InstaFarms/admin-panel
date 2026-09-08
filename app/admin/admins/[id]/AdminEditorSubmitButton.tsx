"use client";

import { useEffect, useRef } from "react";
import { Button, Spinner } from "flowbite-react";
import { useAdminEditorFormContext } from "./AdminEditorFormContext";
import { shake } from "@/lib/motion";

/**
 * The primary "Create Admin" / "Save Changes" button. Lives in the server-
 * component page header but reads the shared form state via context, so it can
 * show a spinner + disable while saving (blocking double-submit) and shake when
 * a submit is rejected by validation.
 */
export default function AdminEditorSubmitButton({
  formId,
  mode,
  canEdit,
}: {
  formId: string;
  mode: "create" | "edit";
  canEdit: boolean;
}) {
  const { loading, validationFailToken } = useAdminEditorFormContext();
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (validationFailToken > 0) shake(ref.current);
  }, [validationFailToken]);

  const idleLabel = mode === "create" ? "Create Admin" : "Save Changes";
  const busyLabel = mode === "create" ? "Creating…" : "Saving…";

  return (
    <Button
      ref={ref}
      type="submit"
      form={formId}
      disabled={!canEdit || loading}
      className="border border-blue-500 bg-blue-600 text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:cursor-not-allowed disabled:border-slate-400 disabled:bg-slate-400 dark:border-blue-400 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus:ring-blue-800"
    >
      <span className="inline-flex items-center gap-2">
        {loading ? <Spinner size="sm" light /> : null}
        {loading ? busyLabel : idleLabel}
      </span>
    </Button>
  );
}
