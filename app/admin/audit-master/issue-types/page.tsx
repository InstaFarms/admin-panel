"use client";

import toast from "react-hot-toast";
import { HiPencil } from "react-icons/hi";
import { useState, useEffect } from "react";

import AuditMasterLayout from "@/components/AuditMasterLayout";
import AuditMasterStatusToggle from "@/components/audit-master/AuditMasterStatusToggle";
import AuditMasterExcelImport from "@/components/audit-master/AuditMasterExcelImport";

import { getAuditMasterData } from "@/actions/auditMasterActions";

import { Table, Button, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from "flowbite-react";
import { JarvisLoader } from "@/components/JarvisLogo";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function IssueTypesPage() {
    const searchParams = useSearchParams();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalItems, setTotalItems] = useState(0);

    const pageNumber = Number(searchParams.get("page")) || 1;
    const perPage = Number(searchParams.get("itemsPerPage")) || 10;
    const searchKey = searchParams.get("searchValue") || undefined;

    const fetchData = async () => {
        setLoading(true);
        const result = await getAuditMasterData("issue-types", {
            pageNumber,
            perPage,
            searchKey,
            orderBy: "label",
            sortorder: "asc"
        });

        if (result.success) {
            setData(result.data);
            setTotalItems(result.total || 0);
        } else {
            toast.error(result.message);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [pageNumber, perPage, searchKey]);

    return (
        <AuditMasterLayout
            title="Issue Types"
            createPath="/admin/audit-master/issue-types/new"
            searchKeys={["Code", "Label"]}
            totalItems={totalItems}
            extraActions={<AuditMasterExcelImport type="issue-types" onDone={fetchData} />}
        >
            <Table hoverable>
                <TableHead>
                  <TableRow>
                      <TableHeadCell>Code</TableHeadCell>
                      <TableHeadCell>Label</TableHeadCell>
                      <TableHeadCell>Description</TableHeadCell>
                      <TableHeadCell>Status</TableHeadCell>
                      <TableHeadCell className="text-right">Actions</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y">
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center">
                                <JarvisLoader size="lg" />
                            </TableCell>
                        </TableRow>
                    ) : data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center">No records found</TableCell>
                        </TableRow>
                    ) : (
                        data.map((item) => (
                            <TableRow key={item.id} className="bg-white dark:border-gray-700 dark:bg-gray-800">
                                <TableCell className="whitespace-nowrap font-bold text-gray-900 dark:text-white">
                                    {item.code}
                                </TableCell>
                                <TableCell>{item.label}</TableCell>
                                <TableCell className="max-w-xs truncate" title={item.description}>{item.description}</TableCell>
                                <TableCell>
                                    <AuditMasterStatusToggle
                                        type="issue-types"
                                        id={item.id}
                                        initialStatus={item.isActive}
                                    />
                                </TableCell>
                                <TableCell className="flex justify-end">
                                    <div className="flex gap-2">
                                        <Link href={`/admin/audit-master/issue-types/${item.id}`}>
                                            <Button size="xs" color="light">
                                                <HiPencil className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </AuditMasterLayout>
    );
}
