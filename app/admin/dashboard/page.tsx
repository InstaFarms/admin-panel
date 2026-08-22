import { ServerPageProps } from "@/utils/types";

import BusinessPerformance from "@/components/dashboard/BusinessPerformance";
import GBVPerformance from "@/components/dashboard/GBVPerformance";
import ABVPerformance from "@/components/dashboard/ABVPerformance";
import { getIcalConnectionStatus } from "@/actions/icalActions";
import { getStatesOptions, getCitiesOptions } from "@/actions/dashboardActions";
import { getDefaultFilters, getDefaultWeeklyFilters } from "@/lib/dashboardUtils";
import { Button, Card } from "flowbite-react";
import Link from "next/link";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

export default async function Page({ searchParams }: ServerPageProps) {
  const [icalStatus, states, cities] = await Promise.all([
    getIcalConnectionStatus(),
    getStatesOptions(),
    getCitiesOptions(),
  ]);
  const connectedCount = icalStatus.data?.connectedCount ?? 0;
  const totalProperties = icalStatus.data?.totalProperties ?? 0;
  const defaultFilters = getDefaultFilters();
  const defaultWeeklyFilters = getDefaultWeeklyFilters();

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Welcome back to the Jarvis admin panel
        </p>
      </div>
      <Card className="bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">iCal Connections</p>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
              <AnimatedNumber value={connectedCount} /> / <AnimatedNumber value={totalProperties} />
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Properties synced with iCal providers
            </p>
          </div>
          <div className="flex gap-2">
            <Button as={Link} href="/admin/dashboard/ical-connections" color="light">
              Open iCal Connections
            </Button>
            <Button as={Link} href="/admin/dashboard/ical-sync-controls" color="light">
              Open iCal Sync Controls
            </Button>
            <Button as={Link} href="/admin/dashboard/milestone-priority" color="blue">
              Open Milestone Priority
            </Button>
          </div>
        </div>
      </Card>
      <BusinessPerformance initialFilters={defaultFilters} states={states} cities={cities} />
      <GBVPerformance initialFilters={defaultFilters} states={states} cities={cities} />
      <ABVPerformance initialFilters={defaultWeeklyFilters} states={states} cities={cities} />
    </div>
  );
}
