"use client";

import { deactivateAdmin, reactivateAdmin, deleteAdmin } from "@/actions/adminActions";
import ConfirmModal from "@/components/ConfirmModal";
import { ADMIN_ADMINS_PATH } from "@/constants/routes";
import { parseServerActionResult } from "@/utils/utils";
import { Button, Spinner } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiBan, HiCheckCircle, HiTrash } from "react-icons/hi";

type Dialog = "deactivate" | "reactivate" | "delete" | null;

/**
 * Replaces the old hard-delete "Remove Admin" button. Deactivate is the normal
 * "revoke access" action (keeps the row + history); Permanently delete is a
 * Super-Admin escape hatch for genuine junk rows. Callers must already gate
 * rendering on SUPER_ADMIN.
 *
 * `compact` = icon-only buttons for a table row; otherwise full labelled buttons
 * for the detail-page header.
 */
export default function AdminStatusButton({
  id,
  isActive,
  compact = false,
}: {
  id: string;
  isActive: boolean;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<Dialog>(null);
  const router = useRouter();

  const run = (kind: Exclude<Dialog, null>) => {
    if (pending) return;
    startTransition(() => {
      const action =
        kind === "deactivate"
          ? deactivateAdmin(id)
          : kind === "reactivate"
            ? reactivateAdmin(id)
            : deleteAdmin(id);

      toast.promise(parseServerActionResult(action), {
        loading:
          kind === "delete"
            ? "Deleting admin..."
            : kind === "deactivate"
              ? "Deactivating..."
              : "Reactivating...",
        success: (message) => {
          setDialog(null);
          if (kind === "delete") router.push(ADMIN_ADMINS_PATH);
          else router.refresh();
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

  return (
    <>
      <div className="flex flex-row items-center gap-2">
        {isActive ? (
          <Button
            color="yellow"
            size={compact ? "xs" : "sm"}
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
            size={compact ? "xs" : "sm"}
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
          size={compact ? "xs" : "sm"}
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
      <ConfirmModal
        showModal={dialog === "delete"}
        tone="danger"
        title="Permanently delete this admin?"
        confirmationText="This cannot be undone and will fail if other records still reference this admin. Deactivate instead if you only need to revoke access."
        confirmLabel="Permanently delete"
        loadingLabel="Deleting..."
        loading={pending}
        acceptCallback={() => run("delete")}
        closeCallback={closeUnlessPending}
      />
    </>
  );
}
