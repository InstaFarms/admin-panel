"use client";

import { useState } from "react";
import toast from "react-hot-toast";

import { useRouter } from "next/navigation";

import ChecklistItemForm from "@/components/audit-master/ChecklistItemForm";

import { createAuditMasterItem } from "@/actions/auditMasterActions";

import { Breadcrumb, BreadcrumbItem, Card } from "flowbite-react";

export default function NewChecklistItemPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreate = async (data: any) => {
        setIsSubmitting(true);
        const result = await createAuditMasterItem("checklist-items", data);
        setIsSubmitting(false);

        if (result.success) {
            toast.success("Checklist Item created successfully");
            router.push("/admin/audit-master/checklist-items");
        } else {
            toast.error(result.message);
        }
    };

    return (
        <div className="flex w-full flex-col">
            <Card className="w-full bg-white">
                <div className="flex flex-col gap-2">
                    <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Checklist Items
                    </h5>

                    <Breadcrumb className="bg-white pb-3 dark:bg-gray-800">
                        <BreadcrumbItem href="/">Home</BreadcrumbItem>
                        <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
                        <BreadcrumbItem href="/admin/audit-master/checklist-items">Checklist Items</BreadcrumbItem>
                        <BreadcrumbItem>Create</BreadcrumbItem>
                    </Breadcrumb>
                </div>

                <div className="w-full max-w-2xl mx-auto rounded-xl bg-slate-100 p-4 sm:p-6 lg:p-8 dark:bg-gray-900">
                    <h6 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white mb-6">
                        Create New Checklist Item
                    </h6>
                    <ChecklistItemForm
                        isSubmitting={isSubmitting}
                        onSubmit={handleCreate}
                        onCancel={() => router.back()}
                    />
                </div>
            </Card>
        </div>
    );
}
