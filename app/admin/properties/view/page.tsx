import PropertyViewDashboard from "./viewDashboard";
import Link from "next/link";

export default function PropertyViewPage() {
  return (
    <div className="p-4 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">View</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage pricing, GST, contacts, and date blocking with instant updates.
        </p>
      </div>
      <PropertyViewDashboard />
    </div>
  );
}
