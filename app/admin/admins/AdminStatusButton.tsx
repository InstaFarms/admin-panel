"use client";

import { deactivateAdmin, reactivateAdmin } from "@/actions/adminActions";
import ConfirmModal from "@/components/ConfirmModal";
import AdminDeleteImpactModal from "./AdminDeleteImpactModal";
import { parseServerActionResult } from "@/utils/utils";
import { Button, Spinner } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiBan, HiCheckCircle, HiTrash } from "react-icons/hi";

type Dialog = "deactivate" | "reactivate" | "delete" | null;

/**
 * Admin status actions. Deactivate is the normal "revoke access" action (keeps
 * the row + history); Permanently delete opens the impact screen. Callers must
 * already gate rendering on SUPER_ADMIN.
 *
 * - `compact`         → icon-only buttons for a table row.
 * - `reactivateOnly`  → render ONLY the Reactivate action (used in the
 *   Deactivated list so a row can be re-enabled without leaving the page). The
 *   full set of actions lives on the admin detail page.
 */
export default function AdminStatusButton({
  id,
  isActive,
  compact = false,
  reactivateOnly = false,
}: {
  id: string;
  isActive: boolean;
  compact?: boolean;
  reactivateOnly?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<Dialog>(null);
  const router = useRouter();

  const run = (kind: "deactivate" | "reactivate") => {
    if (pending) return;
    startTransition(() => {
      const action =
        kind === "deactivate" ? deactivateAdmin(id) : reactivateAdmin(id);

      toast.promise(parseServerActionResult(action), {
        loading: kind === "deactivate" ? "Deactivating..." : "Reactivating...",
        success: (message) => {
          setDialog(null);
          router.refresh();
          return message;
        },
        error: (err) => {
          setDialog(null);
          return (err as Error).message;
        },
      });
    });
  };

  const closeUnlessPending = () => {
    if (!pending) setDialog(null);
  };

  const size = compact ? "xs" : "sm";

  if (reactivateOnly) {
    return (
      <>
        <Button
          color="green"
          size={size}
          disabled={pending || isActive}
          onClick={() => setDialog("reactivate")}
          title="Reactivate admin"
        >
          <span className="inline-flex items-center gap-2">
            {pending ? <Spinner size="sm" light /> : <HiCheckCircle size={16} />}
            {compact ? null : "Reactivate"}
          </span>
        </Button>
        <ConfirmModal
          showModal={dialog === "reactivate"}
          tone="primary"
          title="Reactivate this admin?"
          confirmationText="They will be able to log in again with their existing panel role and permissions."
          confirmLabel="Reactivate"
          loadingLabel="Reactivating..."
          loading={pending}
          acceptCallback={() => run("reactivate")}
          closeCallback={closeUnlessPending}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-row items-center gap-2">
        {isActive ? (
          <Button
            color="yellow"
            size={size}
            disabled={pending}
            onClick={() => setDialog("deactivate")}
            title="Deactivate admin"
          >
            <span className="inline-flex items-center gap-2">
              {pending ? <Spinner size="sm" light /> : <HiBan size={16} />}
              {compact ? null : "Deactivate"}
            </span>
          </Button>
        ) : (
          <Button
            color="green"
            size={size}
            disabled={pending}
            onClick={() => setDialog("reactivate")}
            title="Reactivate admin"
          >
            <span className="inline-flex items-center gap-2">
              {pending ? <Spinner size="sm" light /> : <HiCheckCircle size={16} />}
              {compact ? null : "Reactivate"}
            </span>
          </Button>
        )}

        <Button
          color="red"
          size={size}
          disabled={pending}
          onClick={() => setDialog("delete")}
          title="Permanently delete admin"
        >
          <span className="inline-flex items-center gap-2">
            <HiTrash size={16} />
            {compact ? null : "Permanently delete"}
          </span>
        </Button>
      </div>

      <ConfirmModal
        showModal={dialog === "deactivate"}
        tone="warning"
        title="Deactivate this admin?"
        confirmationText="They are signed out on their next request and cannot log in until reactivated. Their email and phone number stay reserved, and all their history is kept."
        confirmLabel="Deactivate"
        loadingLabel="Deactivating..."
        loading={pending}
        acceptCallback={() => run("deactivate")}
        closeCallback={closeUnlessPending}
      />
      <ConfirmModal
        showModal={dialog === "reactivate"}
        tone="primary"
        title="Reactivate this admin?"
        confirmationText="They will be able to log in again with their existing panel role and permissions."
        confirmLabel="Reactivate"
        loadingLabel="Reactivating..."
        loading={pending}
        acceptCallback={() => run("reactivate")}
        closeCallback={closeUnlessPending}
      />
      <AdminDeleteImpactModal
        id={id}
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
      />
    </>
  );
}
