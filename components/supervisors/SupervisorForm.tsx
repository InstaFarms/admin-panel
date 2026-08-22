"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

import { Button, Label, TextInput, ToggleSwitch, Card } from "flowbite-react";

import { createSupervisor, updateSupervisor } from "@/actions/supervisorActions";

import { useRouter } from "next/navigation";

interface SupervisorFormProps {
    initialData?: any;
    isEdit?: boolean;
}

export default function SupervisorForm({ initialData, isEdit = false }: SupervisorFormProps) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name || "");
            setPhone(initialData.phone || "");
            setEmail(initialData.email || "");
            setIsActive(initialData.isActive ?? true);
        }
    }, [initialData]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !phone || !email) {
            toast.error("Please fill in all required fields.");
            return;
        }

        const data: any = { name, phone, email, isActive };
        setLoading(true);

        try {
            let res;
            if (isEdit && initialData?.id) {
                res = await updateSupervisor(initialData.id, data);
            } else {
                res = await createSupervisor(data);
            }

            if (res.success) {
                toast.success(isEdit ? "Supervisor updated" : "Supervisor created");
                router.push("/admin/supervisors");
                router.refresh();
            } else {
                toast.error(res.message || "Failed to save supervisor");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="max-w-2xl mx-auto w-full">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {isEdit ? "Edit Supervisor" : "Add New Supervisor"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
                <div>
                    <div className="mb-2 block">
                        <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                    </div>
                    <TextInput
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <div className="mb-2 block">
                        <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                    </div>
                    <TextInput
                        id="phone"
                        type="tel"
                        placeholder="1234567890"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                    />
                    <div className="mt-1 text-xs text-gray-500">Critical for Login</div>
                </div>
                <div>
                    <div className="mb-2 block">
                        <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                    </div>
                    <TextInput
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="pt-2">
                    <ToggleSwitch
                        checked={isActive}
                        label="Is Active"
                        onChange={setIsActive}
                    />
                </div>
                <div className="flex justify-end gap-4 pt-4 mt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button color="gray" onClick={() => router.push("/admin/supervisors")} disabled={loading} type="button">
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading || !name || !phone || !email}>
                        {loading ? (isEdit ? "Updating..." : "Saving...") : (isEdit ? "Update Supervisor" : "Save Supervisor")}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
