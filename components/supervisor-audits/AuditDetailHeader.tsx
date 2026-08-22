"use client";

import { HiArrowLeft, HiDownload } from "react-icons/hi";

import { useRouter } from "next/navigation";

import { Card, Badge, Button, Breadcrumb, BreadcrumbItem } from "flowbite-react";

import { formatDate } from "@/lib/dateUtils";

interface AuditDetailHeaderProps {
    session: any;
    failedItemsCount: number;
}

export default function AuditDetailHeader({ session, failedItemsCount }: AuditDetailHeaderProps) {
    const router = useRouter();

    return (
        <Card className="w-full bg-white dark:bg-gray-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button size="sm" color="light" onClick={() => router.push("/admin/supervisor-audits")}>
                        <HiArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h5 className="text-lg font-bold text-gray-900 dark:text-white">
                            {session.propertyName || "Audit Report"}
                        </h5>
                        <p className="text-sm text-gray-500">
                            Supervisor: <span className="font-medium">{session.supervisorName || "N/A"}</span>
                            {" · "}
                            {formatDate(session.startedAt)} → {formatDate(session.completedAt)}
                        </p>
                    </div>
                </div>

                {/* Score Badge */}
                <div className="flex items-center gap-3">
                    <a href={`/admin/supervisor-audits/${session.id}/export`} download>
                        <Button size="sm" color="light">
                            <HiDownload className="mr-2 h-4 w-4" />
                            Export Excel
                        </Button>
                    </a>

                    {failedItemsCount === 0 ? (
                        <Badge color="success" size="lg" className="text-sm font-bold px-4 py-2">
                            ✅ COMPLIANT
                        </Badge>
                    ) : (
                        <Badge color="failure" size="lg" className="text-sm font-bold px-4 py-2">
                            {failedItemsCount} {failedItemsCount === 1 ? "ISSUE" : "ISSUES"} FOUND
                        </Badge>
                    )}
                </div>
            </div>

            <Breadcrumb className="bg-white pt-2 dark:bg-gray-800">
                <BreadcrumbItem href="/">Home</BreadcrumbItem>
                <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
                <BreadcrumbItem href="/admin/supervisor-audits">Supervisor Audits</BreadcrumbItem>
                <BreadcrumbItem href="#">Report</BreadcrumbItem>
            </Breadcrumb>
        </Card>
    );
}
