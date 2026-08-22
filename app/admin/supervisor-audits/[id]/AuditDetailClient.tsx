"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { HiArrowLeft } from "react-icons/hi";

import { useRouter } from "next/navigation";

import { Button } from "flowbite-react";

import { JarvisLoader } from "@/components/JarvisLogo";
import AuditDetailHeader from "@/components/supervisor-audits/AuditDetailHeader";
import AuditDetailChecklist from "@/components/supervisor-audits/AuditDetailChecklist";
import AuditDetailTickets from "@/components/supervisor-audits/AuditDetailTickets";

import { fetchAuditReportDetails } from "@/actions/supervisorAuditActions";
import { getSupervisors } from "@/actions/supervisorActions";

export default function AuditDetailClient({ auditId }: { auditId: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState<any>(null);
    const [supervisors, setSupervisors] = useState<{ id: string; name: string }[]>([]);

    const fetchReport = async () => {
        setLoading(true);
        const result = await fetchAuditReportDetails(auditId);
        if (result.success && result.data) {
            setReportData(result.data);
        } else {
            toast.error(result.error || "Failed to load audit report");
        }

        // Fetch all supervisors for reassign dropdown
        const supResult = await getSupervisors();
        if (supResult.success && supResult.data) {
            setSupervisors(
                supResult.data
                    .filter((s: any) => s.isActive)
                    .map((s: any) => ({ id: s.id, name: s.name }))
            );
        }

        setLoading(false);
    };

    useEffect(() => {
        if (auditId) {
            fetchReport();
        }
    }, [auditId]);

    if (loading) {
        return (
            <div className="flex w-full items-center justify-center py-20">
                <JarvisLoader size="lg" />
            </div>
        );
    }

    if (!reportData) {
        return (
            <div className="flex w-full flex-col items-center justify-center py-20 gap-4">
                <p className="text-gray-500">Audit report not found.</p>
                <Button color="light" onClick={() => router.back()}>
                    <HiArrowLeft className="mr-2 h-4 w-4" /> Go Back
                </Button>
            </div>
        );
    }

    const { session, passedItems, failedItems, tickets } = reportData;

    return (
        <div className="flex w-full flex-col gap-4">
            {/* Top Bar Component */}
            <AuditDetailHeader session={session} failedItemsCount={failedItems.length} />

            {/* Split Screen Container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* LEFT: Audit Checklist Component */}
                <div className="lg:col-span-7">
                    <AuditDetailChecklist passedItems={passedItems} failedItems={failedItems} />
                </div>

                {/* RIGHT: Ticket Action Center Component */}
                <div className="lg:col-span-5">
                    <AuditDetailTickets
                        tickets={tickets}
                        supervisors={supervisors}
                        onUpdated={fetchReport}
                    />
                </div>
            </div>
        </div>
    );
}
