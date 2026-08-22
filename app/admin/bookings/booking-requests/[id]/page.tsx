import { notFound } from "next/navigation";

import { getBookingRequestById } from "@/actions/bookingActions";
import BookingRequestDetailView from "@/components/bookings/BookingRequestDetailView";
import { ServerPageProps } from "@/utils/types";

export const dynamic = "force-dynamic";

export default async function BookingRequestDetailPage({ params }: ServerPageProps) {
  const { id } = await params;

  const requestId = Array.isArray(id) ? id[0] : id;
  if (!requestId) {
    return notFound();
  }

  const result = await getBookingRequestById(requestId);
  if (!result.success || !result.data) {
    return notFound();
  }

  return <BookingRequestDetailView request={result.data as any} />;
}
