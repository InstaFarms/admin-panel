import { redirect } from "next/navigation";
import { ServerPageProps } from "@/utils/types";

export const dynamic = "force-dynamic";

export default async function AllBookingsRedirectPage({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      query.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item);
      }
    }
  }

  const queryString = query.toString();
  redirect(queryString ? `/admin/bookings?${queryString}` : "/admin/bookings");
}
