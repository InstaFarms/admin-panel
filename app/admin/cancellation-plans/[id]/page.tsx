import { redirect } from "next/navigation";
import type { ServerPageProps } from "@/utils/types";

export default async function Page({ params }: ServerPageProps) {
  const { id } = await params;
  const idString = id === undefined ? "" : typeof id === "string" ? id : id[0];
  redirect(`/admin/instafarm/cancellation-plans/${idString}`);
}
