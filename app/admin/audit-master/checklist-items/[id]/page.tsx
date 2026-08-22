"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

import { useRouter, useParams } from "next/navigation";

import ChecklistItemForm from "@/components/audit-master/ChecklistItemForm";

import { updateAuditMasterItem, getAuditMasterData } from "@/actions/auditMasterActions";

import { Breadcrumb, BreadcrumbItem, Card } from "flowbite-react";
import { JarvisLoader } from "@/components/JarvisLogo";

export default function EditChecklistItemPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [initialData, setInitialData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const result = await getAuditMasterData("checklist-items", { perPage: 1000 });
            if (result.success) {
                const item = result.data.find((i: any) => i.id === id);
                if (item) {
                    setInitialData(item);
                } else {
                    toast.error("Item not found");
                    router.push("/admin/audit-master/checklist-items");
                }
            } else {
                toast.error("Error fetching data");
            }
            setLoading(false);
        };
        fetchData();
    }, [id]);

    const handleUpdate = async (data: any) => {
        setIsSubmitting(true);
        const result = await updateAuditMasterItem("checklist-items", id, data);
        setIsSubmitting(false);

        if (result.success) {
            toast.success("Checklist Item updated successfully");
            router.push("/admin/audit-master/checklist-items");
        } else {
            toast.error(result.message);
        }
    };

    if (loading) return <div className="p-6"><JarvisLoader size="lg" /></div>;

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
                        <BreadcrumbItem>Edit</BreadcrumbItem>
                    </Breadcrumb>
                </div>

                <div className="w-full max-w-2xl mx-auto rounded-xl bg-slate-100 p-4 sm:p-6 lg:p-8 dark:bg-gray-900">
                    <h6 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white mb-6">
                        Edit Checklist Item
                    </h6>
                    <ChecklistItemForm
                        initialData={initialData}
                        isSubmitting={isSubmitting}
                        onSubmit={handleUpdate}
                        onCancel={() => router.back()}
                    />
                </div>
            </Card>
        </div>
    );
}
