"use client";

import { overrideOwnerPendingRelease } from "@/actions/walletActions";
import MyButton from "@/components/MyButton";
import { parseServerActionResult } from "@/utils/utils";
import { Label, Select, Textarea, TextInput } from "flowbite-react";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";

type Scope = "OWNER" | "PROPERTY" | "BOOKING";

export default function ReleaseOverrideCard({ ownerId }: { ownerId: string }) {
  const [scope, setScope] = useState<Scope>("OWNER");
  const [loading, startTransition] = useTransition();

  const submit = (formData: FormData) => {
    const localDate = String(formData.get("availableAt") || "");
    const parsedDate = new Date(localDate);
    if (Number.isNaN(parsedDate.getTime())) {
      toast.error("Choose a valid release date and time.");
      return;
    }

    startTransition(() => {
      toast.promise(
        parseServerActionResult(
          overrideOwnerPendingRelease({
            ownerId,
            scope,
            propertyId: String(formData.get("propertyId") || "") || undefined,
            bookingId: String(formData.get("bookingId") || "") || undefined,
            availableAt: parsedDate.toISOString(),
            reason: String(formData.get("reason") || "").trim(),
          })
        ),
        {
          loading: "Rescheduling frozen earnings…",
          success: (message) => message,
          error: (error) => (error as Error).message,
        }
      );
    });
  };

  return (
    <form action={submit} className="flex flex-col gap-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Changes the release time only for existing frozen ledger entries. The property policy remains the default for future bookings. A reason is retained on every affected entry.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="releaseScope">Apply to</Label>
          <Select id="releaseScope" value={scope} onChange={(event) => setScope(event.target.value as Scope)}>
            <option value="OWNER">All frozen earnings for this owner</option>
            <option value="PROPERTY">One property</option>
            <option value="BOOKING">One booking</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="availableAt">Allow withdrawal from</Label>
          <TextInput id="availableAt" name="availableAt" type="datetime-local" required />
        </div>
      </div>
      {scope === "PROPERTY" ? (
        <div>
          <Label htmlFor="propertyId">Property UUID</Label>
          <TextInput id="propertyId" name="propertyId" placeholder="Property UUID" required />
        </div>
      ) : null}
      {scope === "BOOKING" ? (
        <div>
          <Label htmlFor="bookingId">Booking UUID</Label>
          <TextInput id="bookingId" name="bookingId" placeholder="Booking UUID" required />
        </div>
      ) : null}
      <div>
        <Label htmlFor="releaseReason">Reason</Label>
        <Textarea id="releaseReason" name="reason" rows={2} minLength={3} required placeholder="Why is this release being changed?" />
      </div>
      <div className="flex justify-end">
        <MyButton type="submit" loading={loading}>Save release date</MyButton>
      </div>
    </form>
  );
}
