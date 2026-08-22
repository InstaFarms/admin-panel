import { getBookingConfirmationById } from "@/actions/bookingConfirmationActions";

import RequestDetailsView from "@/components/bookings/RequestDetailsView";

import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RequestDetailsPage({ params }: { params: { id: string } }) {
    const request = await getBookingConfirmationById(params.id);

    if (!request) {
        return notFound();
    }

    return <RequestDetailsView request={request} />;
}
