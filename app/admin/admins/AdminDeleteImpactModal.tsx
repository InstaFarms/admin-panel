"use client";

import {
  getAdminDeleteImpact,
  purgeAdmin,
  type AdminDeleteImpact,
} from "@/actions/adminActions";
import { elevatedModalTheme } from "@/components/ConfirmModal";
import { AnimatedModalContent } from "@/components/ui/AnimatedModalContent";
import { staggerReveal } from "@/components/bookings/wizard/gsapHelpers";
import { ADMIN_ADMINS_PATH } from "@/constants/routes";
import { parseServerActionResult } from "@/utils/utils";
import {
  Badge,
  Button,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  TextInput,
} from "flowbite-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiExclamationCircle } from "react-icons/hi";

type Props = {
  id: string;
  open: boolean;
  onClose: () => void;
};

function fullName(a: AdminDeleteImpact["admin"]) {
  return `${a.firstName} ${a.lastName ?? ""}`.trim();
}

export default function AdminDeleteImpactModal({ id, open, onClose }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [impact, setImpact] = useState<AdminDeleteImpact | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const impactRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (impact) staggerReveal(impactRef.current);
  }, [impact]);

  useEffect(() => {
    if (!open) {
      setImpact(null);
      setLoadError(null);
      setTyped("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    getAdminDeleteImpact(id)
      .then((res) => {
        if (cancelled) return;
        if ("error" in res) setLoadError(res.error);
        else setImpact(res.impact);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, id]);

  const guardBlocked =
    !!impact && (impact.guards.isSelf || impact.guards.isLastSuperAdmin);
  const emailMatches =
    !!impact &&
    typed.trim().toLowerCase() === impact.admin.email.trim().toLowerCase();
  const canConfirm = !!impact && !guardBlocked && emailMatches && !pending;

  const confirm = () => {
    if (!canConfirm || !impact) return;
    startTransition(() => {
      toast.promise(parseServerActionResult(purgeAdmin(id, typed)), {
        loading: "Permanently deleting…",
        success: (message) => {
          onClose();
          router.push(ADMIN_ADMINS_PATH);
          return message;
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  const removed = impact?.removed.filter((r) => r.count > 0) ?? [];
  const unlinked = impact?.unlinked.filter((r) => r.count > 0) ?? [];

  return (
    <Modal
      show={open}
      onClose={() => !pending && onClose()}
      size="2xl"
      theme={elevatedModalTheme}
    >
      <ModalHeader>Permanently delete admin</ModalHeader>
      <ModalBody>
        <AnimatedModalContent>
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-10 text-gray-500 dark:text-gray-300">
            <Spinner size="md" /> Checking what this admin is connected to…
          </div>
        ) : loadError ? (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {loadError}
          </div>
        ) : impact ? (
          <div ref={impactRef} className="flex flex-col gap-5 text-sm text-gray-700 dark:text-gray-200">
            <p>
              Permanently deleting{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {fullName(impact.admin)}
              </span>{" "}
              (<span className="font-mono">{impact.admin.email}</span>) removes the
              admin account and everything listed below.{" "}
              <span className="font-semibold text-red-600 dark:text-red-400">
                This cannot be undone.
              </span>
            </p>

            {guardBlocked && (
              <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                <HiExclamationCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <span>
                  {impact.guards.isSelf
                    ? "You can't permanently delete your own admin account."
                    : "This is the last Super Admin and can't be deleted."}
                </span>
              </div>
            )}

            <section>
              <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">
                Will be permanently removed
              </h4>
              {removed.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {removed.map((r) => (
                    <li key={r.key} className="flex items-center justify-between">
                      <span>{r.label}</span>
                      <Badge color="failure">{r.count}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  Nothing else — just the admin account.
                </p>
              )}
            </section>

            {unlinked.length > 0 && (
              <section>
                <h4 className="mb-1 font-semibold text-gray-900 dark:text-white">
                  Kept, but no longer linked to this admin
                </h4>
                <p className="mb-2 text-gray-500 dark:text-gray-400">
                  These records stay; their reference to this admin is cleared.
                </p>
                <ul className="flex flex-col gap-1.5">
                  {unlinked.map((r) => (
                    <li key={r.key} className="flex items-center justify-between">
                      <span>{r.label}</span>
                      <Badge color="warning">{r.count}</Badge>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h4 className="mb-1 font-semibold text-gray-900 dark:text-white">
                Left as a historical stamp
              </h4>
              <p className="text-gray-500 dark:text-gray-400">
                About{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  {impact.staleStampCount ?? "some"}
                </span>{" "}
                records elsewhere will keep this admin&apos;s ID as their
                &ldquo;created by&rdquo; / &ldquo;updated by&rdquo; value (the name
                will show blank). These are not modified.
              </p>
            </section>

            {!guardBlocked && (
              <div>
                <Label htmlFor="purge-confirm" className="mb-1 block">
                  Type <span className="font-mono">{impact.admin.email}</span> to
                  confirm
                </Label>
                <TextInput
                  id="purge-confirm"
                  autoComplete="off"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={impact.admin.email}
                  disabled={pending}
                />
              </div>
            )}
          </div>
        ) : null}
        </AnimatedModalContent>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button color="red" onClick={confirm} disabled={!canConfirm}>
          <span className="inline-flex items-center gap-2">
            {pending ? <Spinner size="sm" light /> : null}
            Permanently delete
          </span>
        </Button>
      </ModalFooter>
    </Modal>
  );
}
