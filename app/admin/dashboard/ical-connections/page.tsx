import { Card } from "flowbite-react";
import { getIcalConnectionStatus } from "@/actions/icalActions";
import ICalConnectionsTable from "./ICalConnectionsTable";

export default async function ICalConnectionsPage() {
  const result = await getIcalConnectionStatus();
  const rows = result.data?.rows || [];
  const connectedCount = result.data?.connectedCount ?? 0;
  const totalProperties = result.data?.totalProperties ?? 0;

  return (
    <div className="flex w-full flex-col gap-6">
      <Card className="bg-white shadow-sm border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">iCal Connection Status</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {connectedCount} connected out of {totalProperties} properties
          </p>
        </div>
      </Card>

      <Card className="bg-white shadow-sm border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <ICalConnectionsTable rows={rows} />
      </Card>
    </div>
  );
}
