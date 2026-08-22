import { redirect } from "next/navigation";

/** The legacy fill flow depended on disabled third-party APIs. */
export default function LegacyThirdPartyFillPage() {
  redirect("/admin/bookings/create?reservationSource=OTA");
}
