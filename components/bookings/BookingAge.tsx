"use client";

import { useEffect, useState } from "react";

import {
  formatDateTime,
  formatTimeSinceBooking,
} from "@/utils/bookings/formatting";

type BookingAgeProps = {
  createdAt: string | Date | null | undefined;
};

export default function BookingAge({ createdAt }: BookingAgeProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());

    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <span suppressHydrationWarning title={formatDateTime(createdAt)}>
      {now ? formatTimeSinceBooking(createdAt, now) : formatDateTime(createdAt)}
    </span>
  );
}
