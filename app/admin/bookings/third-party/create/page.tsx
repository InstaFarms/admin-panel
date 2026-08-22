import { redirect } from "next/navigation";

/** Legacy third-party booking creation is consolidated into Reservation Desk. */
export default function LegacyThirdPartyCreatePage() {
  redirect("/admin/bookings/create?reservationSource=OTA");
}
