"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { HiEye } from "react-icons/hi";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { Card, Badge, Button, Select, Breadcrumb, BreadcrumbItem, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from "flowbite-react";

import { JarvisLoader } from "@/components/JarvisLogo";
import Searchbar from "@/components/Searchbar";
import Pagination from "@/components/Pagination";

import { fetchSupervisorAudits } from "@/actions/supervisorAuditActions";

import { formatAdminDateTime, formatDate } from "@/lib/dateUtils";

export default function SupervisorAuditsPage() {
    const searchParams = useSearchParams();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalItems, setTotalItems] = useState(0);
    const [statusFilter, setStatusFilter] = useState("All");

    const pageNumber = Number(searchParams.get("page")) || 1;
    const perPage = Number(searchParams.get("itemsPerPage")) || 10;
    const searchKey = searchParams.get("searchValue") || undefined;

    const fetchData = async () => {
        setLoading(true);
        const result = await fetchSupervisorAudits({
            pageNumber,
            perPage,
            searchKey,
            statusFilter,
        });

        if (result.success) {
            setData(result.data || []);
            setTotalItems(result.total || 0);
        } else {
            toast.error(result.error || "Failed to fetch audits");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [pageNumber, perPage, searchKey, statusFilter]);

    const handleExportCSV = () => {
        if (data.length === 0) {
            toast.error("No data to export");
            return;
        }

        const headers = ["Audit ID", "Property Name", "Supervisor", "Started At", "Completed At", "Status", "Issues Found"];
        const rows = data.map((audit) => [
            audit.id,
            audit.propertyName || "N/A",
            audit.supervisorName || "N/A",
            formatAdminDateTime(audit.startedAt, { fallback: "-" }),
            formatAdminDateTime(audit.completedAt, { fallback: "-" }),
            audit.status,
            audit.issuesCount,
        ]);

        const csvContent = [headers, ...rows].map((row) => row.map((cell: any) => `"${cell}"`).join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `supervisor-audits-${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("CSV exported successfully");
    };



    const getStatusBadge = (audit: any) => {
        if (audit.status === "IN_PROGRESS") {
            return <Badge color="warning" className="text-xs font-semibold">IN PROGRESS</Badge>;
        }
        if (audit.issuesCount === 0) {
            return <Badge color="success" className="text-xs font-semibold whitespace-nowrap">NO ISSUES FOUND</Badge>;
        }
        return (
            <Badge color="failure" className="text-xs font-semibold whitespace-nowrap">
                {audit.issuesCount} {audit.issuesCount === 1 ? "ISSUE" : "ISSUES"} FOUND
            </Badge>
        );
    };

    return (
        <div className="flex w-full flex-col">
            <Card className="w-full bg-white dark:bg-gray-800">
                <div className="space-between flex w-full flex-col gap-4">
                    {/* Title + Command Bar */}
                    <div className="flex flex-col sm:flex-row w-full gap-3 items-start sm:items-center justify-between">
                        <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                            Supervisor Audits
                        </h5>

                        <div className="flex w-full sm:w-auto gap-2 items-center flex-wrap">
                            <div className="min-w-0 flex-1 sm:w-128">
                                <Searchbar
                                    searchKeys={["Property Name", "Audit ID"]}
                                    defaultSearchKey="Property Name"
                                />
                            </div>
                            <Select
                                sizing="sm"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-auto"
                            >
                                <option value="All">All Status</option>
                                <option value="Completed">Completed</option>
                                <option value="In Progress">In Progress</option>
                            </Select>

                        </div>
                    </div>

                    {/* Breadcrumbs */}
                    <div className="flex flex-col sm:flex-row">
                        <Breadcrumb className="bg-white pb-3 dark:bg-gray-800">
                            <BreadcrumbItem href="/">Home</BreadcrumbItem>
                            <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
                            <BreadcrumbItem href="#">Supervisor Audits</BreadcrumbItem>
                        </Breadcrumb>
                    </div>
                </div>

                {/* Data Table */}
                <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
                    <div className="overflow-x-auto">
                        <Table hoverable striped>
                            <TableHead>
                              <TableRow>
                                  <TableHeadCell className="whitespace-nowrap">Property Name</TableHeadCell>
                                  <TableHeadCell className="whitespace-nowrap">Supervisor</TableHeadCell>
                                  <TableHeadCell className="whitespace-nowrap">Start Time</TableHeadCell>
                                  <TableHeadCell className="whitespace-nowrap">End Time</TableHeadCell>
                                  <TableHeadCell className="whitespace-nowrap text-right">Action</TableHeadCell>
                              </TableRow>
                            </TableHead>
                            <TableBody className="divide-y">
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-10">
                                            <JarvisLoader size="lg" />
                                        </TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                                            No audit records found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((audit) => (
                                        <TableRow key={audit.id} className="bg-white dark:border-gray-700 dark:bg-gray-800">
                                            <TableCell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                                                {audit.propertyName || "N/A"}
                                            </TableCell>
                                            <TableCell className="text-gray-700 dark:text-gray-300">
                                                {audit.supervisorName || "N/A"}
                                            </TableCell>
                                            <TableCell className="text-gray-600 dark:text-gray-400 text-sm">
                                                {formatDate(audit.startedAt)}
                                            </TableCell>
                                            <TableCell className="text-gray-600 dark:text-gray-400 text-sm">
                                                {formatDate(audit.completedAt)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/admin/supervisor-audits/${audit.id}`}>
                                                    <Button size="xs" color="blue" className="whitespace-nowrap">
                                                        <HiEye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Pagination */}
                {totalItems > 0 && (
                    <div className="flex justify-center pt-4">
                        <Pagination totalItems={totalItems} />
                    </div>
                )}
            </Card>
        </div>
    );
}
