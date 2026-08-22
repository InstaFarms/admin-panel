import { Metadata } from "next";

import { getSupervisors } from "@/actions/supervisorActions";

import SupervisorForm from "@/components/supervisors/SupervisorForm";

import { notFound } from "next/navigation";

export const metadata: Metadata = {
    title: "Edit Supervisor | Admin",
    description: "Edit supervisor details",
};

interface EditSupervisorPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditSupervisorPage({ params }: EditSupervisorPageProps) {
    const { id } = await params;
    const res = await getSupervisors();

    // We can filter from all supervisors or create a getSupervisor(id) action. 
    // Filtering here since it's already available.
    const supervisor = res.data?.find((s: any) => s.id === id);

    if (!supervisor) {
        return notFound();
    }

    return (
        <div className="flex w-full flex-col p-4 sm:p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Supervisors
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Edit supervisor details.</p>
            </div>
            <div className="w-full">
                <SupervisorForm initialData={supervisor} isEdit={true} />
            </div>
        </div>
    );
}
