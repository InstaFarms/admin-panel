import { ServerPageProps } from "@/utils/types";
import BookingEditor from "@/components/bookings/edit/BookingEditor";
import DarkModeCard from "@/components/bookings/edit/DarkModeCard";

export default async function Page({ params }: ServerPageProps) {
  const { id } = await params;

  let idString = "";
  if (id === undefined) {
    idString = "";
  } else if (typeof id === "string") {
    idString = id;
  } else {
    idString = id[0];
  }

  // No need to fetch data here anymore - the hook does it
  return (
    <DarkModeCard>
      <BookingEditor bookingId={idString} />
    </DarkModeCard>
  );
}
