import StateListPage from "./StateListPage";
import type { ServerPageProps } from "@/utils/types";

export const dynamic = "force-dynamic";

export default async function LocationStatesPage({ searchParams }: ServerPageProps) {
  return <StateListPage searchParams={searchParams} />;
}
