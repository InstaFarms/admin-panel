"use client";

import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiRefresh, HiReply } from "react-icons/hi";

import { Table, Button, Badge, Spinner, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from "flowbite-react";

import Link from "next/link";

import { fetchPermanentLogs, revertPermanentBulkUpdate } from "@/actions/bulkActions";
import { getAllPropertiesForSelector } from "@/actions/propertyActions";

import RevertConfirmationModal from "@/components/BulkPermanentUpdate/RevertConfirmationModal";

export default function PermanentPriceUpdateLogs({
    brandId,
    brandName,
    createPath = "/admin/properties/permanent-price-update/create"
}: {
    brandId?: string;
    brandName?: string;
    createPath?: string;
}) {
    const [logs, setLogs] = useState<any[]>([]);
    const [entities, setEntities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, startTransition] = useTransition();

    // Modal State
    const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState<any>(null);

    const loadData = async () => {
        setLoading(true);
        const [logsRes, entitiesRes] = await Promise.all([
            fetchPermanentLogs(brandId),
            getAllPropertiesForSelector(brandName)
        ]);

        if (logsRes.success) {
            setLogs(logsRes.data || []);
        } else {
            toast.error(logsRes.message || "Failed to fetch logs");
        }

        if (entitiesRes.data) {
            setEntities(
                entitiesRes.data.map((p: any) => ({
                    ...p,
                    entityName: p.propertyName ?? p.entityName,
                }))
            );
        }

        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleRevertClick = (log: any) => {
        setSelectedLog(log);
        setIsRevertModalOpen(true);
    };

    const confirmRevert = async () => {
        if (!selectedLog) return;

        startTransition(() => {
            revertPermanentBulkUpdate(selectedLog.id).then((res) => {
                if (res.success) {
                    toast.success(res.message || "Reverted successfully");
                    setIsRevertModalOpen(false);
                    setSelectedLog(null);
                    loadData();
                } else {
                    toast.error(res.message || "Failed to revert");
                }
            });
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center p-10">
                <Spinner size="xl" />
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h6 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Update History
                </h6>
                <div className="flex gap-2">
                    <Link href={createPath}>
                        <Button color="blue" size="sm">
                            New Permanent Update
                        </Button>
                    </Link>
                    <Button color="gray" size="sm" onClick={loadData} disabled={isRefreshing}>
                        <HiRefresh className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <Table hoverable>
                    <TableHead>
                      <TableRow>
                          <TableHeadCell>Date</TableHeadCell>
                          <TableHeadCell>Admin</TableHeadCell>
                          <TableHeadCell>Operation</TableHeadCell>
                          <TableHeadCell>Applicable Days</TableHeadCell>
                          <TableHeadCell>Status</TableHeadCell>
                          <TableHeadCell>Action</TableHeadCell>
                      </TableRow>
                    </TableHead>
                    <TableBody className="divide-y">
                        {logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                                    No update history found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id} className="bg-white dark:border-gray-700 dark:bg-gray-800">
                                    <TableCell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </TableCell>
                                    <TableCell>{log.adminName}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="capitalize">{log.operationType.replace('_', ' ')}</span>
                                            <span className="text-xs text-gray-500">{log.operationValue}{log.operationMode === 'percentage' ? '%' : ' (Flat)'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {log.applicableDays.map((day: string) => (
                                                <Badge key={day} color="indigo" size="xs" className="capitalize">
                                                    {day.slice(0, 3)}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge color={log.status === "applied" ? "success" : "warning"}>
                                            {log.status.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {log.status === "applied" ? (
                                            <Button
                                                size="xs"
                                                color="failure"
                                                onClick={() => handleRevertClick(log)}
                                                disabled={isRefreshing}
                                                className="h-8 w-8 !p-0 flex items-center justify-center rounded-full shadow-md hover:shadow-lg hover:scale-110 transition-all font-bold"
                                                pill
                                                title="Revert Changes"
                                            >
                                                <HiReply className="h-4 w-4" />
                                            </Button>
                                        ) : (
                                            <span className="text-xs text-gray-400">N/A</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Revert Confirmation Modal */}
            <RevertConfirmationModal
                show={isRevertModalOpen}
                onClose={() => setIsRevertModalOpen(false)}
                onConfirm={confirmRevert}
                log={selectedLog}
                allLogs={logs}
                entities={entities}
                isRefreshing={isRefreshing}
            />
        </div>
    );
}

