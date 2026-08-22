import React from "react";
import MilestonePriorityDashboard from "@/components/dashboard/MilestonePriorityDashboard";
import { ServerPageProps } from "@/utils/types";

export const dynamic = "force-dynamic";

export default async function MilestonePriorityPage({ searchParams }: ServerPageProps) {
  return (
    <div className="w-full">
      <MilestonePriorityDashboard />
    </div>
  );
}
