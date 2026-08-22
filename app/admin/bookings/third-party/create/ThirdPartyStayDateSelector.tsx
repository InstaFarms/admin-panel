"use client";

import { getPropertyAvailability } from "@/actions/bookingActions";
import { BookingStayCalendar } from "@/components/bookings/create/CreateBookingEditor";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

const parseDate = (value: string): Date | null => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toDateKey = (date: Date | null): string => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function ThirdPartyStayDateSelector({
  selectedPropertyId,
  checkinDate,
  checkoutDate,
}: {
  selectedPropertyId: string;
  checkinDate: string;
  checkoutDate: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const checkin = parseDate(checkinDate);
  const checkout = parseDate(checkoutDate);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [checkinBlockedDates, setCheckinBlockedDates] = useState<Date[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const updateParams = (nextCheckin: Date | null, nextCheckout: Date | null) => {
    const next = new URLSearchParams(searchParams.toString());
    const checkinValue = toDateKey(nextCheckin);
    const checkoutValue = toDateKey(nextCheckout);
    if (checkinValue) next.set("checkinDate", checkinValue);
    else next.delete("checkinDate");
    if (checkoutValue) next.set("checkoutDate", checkoutValue);
    else next.delete("checkoutDate");
    router.push(`${pathname}?${next.toString()}`);
  };

  const fetchBlockedDates = useCallback(async () => {
    if (!selectedPropertyId) {
      setBlockedDates([]);
      setCheckinBlockedDates([]);
      return;
    }

    setIsRefreshing(true);
    try {
      const result = await getPropertyAvailability(selectedPropertyId);
      if (!result.success) {
        setBlockedDates([]);
        setCheckinBlockedDates([]);
        return;
      }

      const allBlockedDates: Date[] = [];
      const inBlockedDates: Date[] = [];

      (result.success.blockedDates || []).forEach((dateStr: string) => {
        allBlockedDates.push(new Date(`${dateStr}T00:00:00`));
      });

      (result.success.bookedRanges || []).forEach((range: { checkinDate: string; checkoutDate: string }) => {
        const start = new Date(`${range.checkinDate}T00:00:00`);
        const end = new Date(`${range.checkoutDate}T00:00:00`);
        inBlockedDates.push(start);

        for (let time = start.getTime(); time < end.getTime(); time += 24 * 60 * 60 * 1000) {
          allBlockedDates.push(new Date(time));
        }
      });

      setBlockedDates(allBlockedDates);
      setCheckinBlockedDates(inBlockedDates);
    } catch {
      toast.error("Failed to refresh availability calendar.");
      setBlockedDates([]);
      setCheckinBlockedDates([]);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedPropertyId]);

  useEffect(() => {
    fetchBlockedDates();
  }, [fetchBlockedDates]);

  return (
    <div className="space-y-2">
      <BookingStayCalendar
        checkinDate={checkin}
        checkoutDate={checkout}
        blockedDates={blockedDates}
        checkinBlockedDates={checkinBlockedDates}
        disabled={!selectedPropertyId}
        isRefreshing={isRefreshing}
        commercialPricing={null}
        specialDatePriceMap={new Map()}
        onChange={updateParams}
        onClear={() => updateParams(null, null)}
        onRefresh={fetchBlockedDates}
      />
      <input type="hidden" name="checkinDate" value={toDateKey(checkin)} />
      <input type="hidden" name="checkoutDate" value={toDateKey(checkout)} />
    </div>
  );
}
