import { Metadata } from "next";

import SupervisorForm from "@/components/supervisors/SupervisorForm";

export const metadata: Metadata = {
    title: "Add Supervisor | Admin",
    description: "Add a new supervisor",
};

export default function AddSupervisorPage() {
    return (
        <div className="flex w-full flex-col p-4 sm:p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Supervisors
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Add a new supervisor to the system.</p>
            </div>
            <div className="w-full">
                <SupervisorForm />
            </div>
        </div>
    );
}
