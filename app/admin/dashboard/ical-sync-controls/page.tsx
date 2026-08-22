import { Card } from "flowbite-react";
import { getIcalConnectionStatus } from "@/actions/icalActions";
import ICalSyncControlsClient from "./ICalSyncControlsClient";

export default async function ICalSyncControlsPage() {
  const result = await getIcalConnectionStatus();
  const rows = result.data?.rows || [];
  const fetchError = result.error;

  return (
    <div className="flex w-full flex-col gap-6">
      <Card className="bg-white shadow-sm border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">iCal Sync Controls</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Bulk stop or allow Airbnb / Booking iCal sync per property.
          </p>
        </div>
      </Card>

      <Card className="bg-white shadow-sm border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        {fetchError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {fetchError}
          </div>
        )}
        <ICalSyncControlsClient rows={rows} />
      </Card>
    </div>
  );
}
