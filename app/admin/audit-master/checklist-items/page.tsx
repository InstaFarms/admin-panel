"use client";

import { useState, useEffect } from "react";
import { HiPencil } from "react-icons/hi";
import toast from "react-hot-toast";

import AuditMasterLayout from "@/components/AuditMasterLayout";
import AuditMasterStatusToggle from "@/components/audit-master/AuditMasterStatusToggle";
import AuditMasterExcelImport from "@/components/audit-master/AuditMasterExcelImport";

import { getAuditMasterData } from "@/actions/auditMasterActions";

import { Table, Badge, Button, Label, Select, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from "flowbite-react";
import { JarvisLoader } from "@/components/JarvisLogo";

import { useSearchParams } from "next/navigation";

export default function ChecklistItemsPage() {
    const searchParams = useSearchParams();
    const [data, setData] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalItems, setTotalItems] = useState(0);

    const pageNumber = Number(searchParams.get("page")) || 1;
    const perPage = Number(searchParams.get("itemsPerPage")) || 10;
    const searchKey = searchParams.get("searchValue") || undefined;

    const fetchCategories = async () => {
        const result = await getAuditMasterData("checklist-categories", {
            perPage: 100
        });
        if (result.success) {
            setCategories(result.data);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        const result = await getAuditMasterData("checklist-items", {
            pageNumber,
            perPage,
            searchKey,
            orderBy: "name",
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
        fetchCategories();
    }, []);

    // Re-fetch data when pagination or search changes
    useEffect(() => {
        fetchData();
    }, [pageNumber, perPage, searchKey]);

    return (
        <AuditMasterLayout
            title="Master Checklist Items"
            createPath="/admin/audit-master/checklist-items/new"
            searchKeys={["Name"]}
            totalItems={totalItems}
            extraActions={<AuditMasterExcelImport type="checklist-items" onDone={fetchData} />}
        >


            <Table hoverable>
                <TableHead>
                  <TableRow>
                      <TableHeadCell>Name</TableHeadCell>
                      <TableHeadCell>Category</TableHeadCell>
                      <TableHeadCell>Type</TableHeadCell>
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
                                <TableCell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                                    {item.name}
                                </TableCell>
                                <TableCell>
                                    {categories.find(c => c.id === item.categoryId)?.name || item.categoryId}
                                </TableCell>
                                <TableCell>
                                    <Badge color="info">{item.itemType}</Badge>
                                </TableCell>
                                <TableCell>
                                    <AuditMasterStatusToggle
                                        type="checklist-items"
                                        id={item.id}
                                        initialStatus={item.isActive}
                                    />
                                </TableCell>
                                <TableCell className="flex justify-end">
                                    <div className="flex gap-2">
                                        <a href={`/admin/audit-master/checklist-items/${item.id}`}>
                                            <Button size="xs" color="light">
                                                <HiPencil className="h-4 w-4" />
                                            </Button>
                                        </a>
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
