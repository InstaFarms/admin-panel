import { Metadata } from "next";

import SupervisorsTable from "@/components/supervisors/SupervisorsTable";

export const metadata: Metadata = {
    title: "Supervisors | Admin",
    description: "Manage supervisors",
};

export default function SupervisorsPage() {
    return (
        <div className="flex w-full flex-col p-4 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Supervisors
            </h1>
            <div>
                <SupervisorsTable />
            </div>
        </div>
    );
}
