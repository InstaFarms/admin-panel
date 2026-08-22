"use client";

import { useRef, useTransition } from "react";
import { Button } from "flowbite-react";
import Link from "next/link";

interface Props {
  action: (formData: FormData) => Promise<void>;
  hiddenFields: Record<string, string>;
  backHref: string;
}

export default function ElivaasBookingForm({ action, hiddenFields, backHref }: Props) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    startTransition(async () => {
      await action(formData);
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Hidden fields passed from the booking summary page */}
      {Object.entries(hiddenFields).map(([key, val]) => (
        <input key={key} type="hidden" name={key} value={val} />
      ))}

      <h6 className="font-semibold text-gray-800 dark:text-white">Guest Details</h6>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="First Name" name="firstName" required />
        <Field label="Last Name" name="lastName" required />
        <Field label="Email" name="email" type="email" required />
        <Field
          label="Phone"
          name="phone"
          type="tel"
          placeholder="+919876543210"
          required
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? "Confirming Booking…" : "Confirm Booking on Elivaas"}
        </Button>
        {isPending ? (
          <Button color="light" disabled>Back</Button>
        ) : (
          <Link href={backHref}>
            <Button color="light">Back</Button>
          </Link>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      />
    </div>
  );
}
