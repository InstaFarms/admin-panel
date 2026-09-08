"use client";

import {
  getBookingSlotAssignments,
  type BookingSlotAssignments,
} from "@/actions/sleepingSlotActions";
import { useEffect, useState } from "react";

/**
 * Bed-wise bookings only: shows which beds a booking holds and the male/female
 * breakup. Renders nothing for ordinary whole-property bookings (the endpoint
 * 404s and we treat that as "not a bed-wise booking"), so it is safe to mount
 * on every booking detail page.
 */
export default function BookingBedAssignments({
  propertyId,
  bookingId,
}: {
  propertyId?: string | null;
  bookingId: string;
}) {
  const [data, setData] = useState<BookingSlotAssignments | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!propertyId) {
      setLoading(false);
      return;
    }
    getBookingSlotAssignments(propertyId, bookingId)
      .then(({ data }) => {
        if (active) setData(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [propertyId, bookingId]);

  // Nothing to show unless this is a bed-wise booking with assignments.
  if (loading || !data || data.assignments.length === 0) return null;

  const genderPill = (gender: "MALE" | "FEMALE") => (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        gender === "MALE"
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          : "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300"
      }`}
    >
      {gender === "MALE" ? "Male" : "Female"}
    </span>
  );

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Bed Assignments
        </h3>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {data.maleGuestCount ?? 0} male · {data.femaleGuestCount ?? 0} female ·{" "}
          {data.assignments.length} bed{data.assignments.length === 1 ? "" : "s"}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs dark:bg-slate-800">
            <tr>
              {["Room", "Bed type", "Slot", "Occupant"].map((h) => (
                <th key={h} className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.assignments.map((a) => (
              <tr key={a.slotId} className="border-t border-slate-100 dark:border-slate-700">
                <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{a.roomName}</td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                  {a.bedType === "DOUBLE" ? "Double" : "Single"}
                </td>
                <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300">
                  Slot {a.slotLabel}
                </td>
                <td className="px-4 py-2">{genderPill(a.guestGender)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
