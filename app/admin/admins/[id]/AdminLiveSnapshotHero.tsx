"use client";

import { useEffect, useRef } from "react";
import { Badge } from "flowbite-react";
import { useAdminEditorFormContext } from "./AdminEditorFormContext";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { flashValue } from "@/components/bookings/wizard/gsapHelpers";

/** Flash a value span whenever its text changes (skips the first render). */
function useFlashOnChange(value: string) {
  const ref = useRef<HTMLSpanElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    flashValue(ref.current);
  }, [value]);
  return ref;
}

/**
 * Gradient "snapshot" card above the admin editor - the same treatment the
 * detail view and the create-user page use, but wired to the live form so it
 * previews the admin as it is filled in / edited.
 */
export default function AdminLiveSnapshotHero({ mode }: { mode: "create" | "edit" }) {
  const { preview } = useAdminEditorFormContext();

  const nameRef = useFlashOnChange(preview.fullName);
  const emailRef = useFlashOnChange(preview.email);
  const phoneRef = useFlashOnChange(preview.phoneNumber);

  const nameText = preview.fullName || (mode === "create" ? "New Admin" : "Unnamed Admin");
  const emailText = preview.email || "Not added";
  const phoneText = preview.phoneNumber || "Not added";

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-slate-100 via-white to-slate-100 px-6 py-7 shadow-sm dark:border-gray-700 dark:from-[#111827] dark:via-[#131c2f] dark:to-[#0f172a] xl:px-7">
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-end">
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-gray-500 dark:text-slate-400">
              {mode === "create" ? "New Admin" : "Live Preview"}
            </p>
            <h2 className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">
              <span ref={nameRef} className="inline-block">
                {nameText}
              </span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge color="info">{preview.panelRoleLabel}</Badge>
            {preview.gender ? <Badge color="gray">{preview.gender}</Badge> : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-slate-300">
            <span>
              Email:{" "}
              <span ref={emailRef} className="inline-block font-medium text-gray-900 dark:text-white">
                {emailText}
              </span>
            </span>
            <span>
              Primary contact:{" "}
              <span ref={phoneRef} className="inline-block font-medium text-gray-900 dark:text-white">
                {phoneText}
              </span>
            </span>
          </div>
        </div>

        <div className="xl:text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-slate-400">
            Profile completeness
          </p>
          <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
            <AnimatedNumber
              value={preview.completenessPct}
              format={(n) => `${Math.round(n)}%`}
            />
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">
            Based on the identity, contact, and address details filled in.
          </p>
        </div>
      </div>
    </section>
  );
}
