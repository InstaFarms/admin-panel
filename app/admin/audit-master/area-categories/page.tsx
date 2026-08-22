"use client";

import { useState, useEffect } from "react";
import { HiPencil } from "react-icons/hi";
import toast from "react-hot-toast";

import AuditMasterStatusToggle from "@/components/audit-master/AuditMasterStatusToggle";
import AuditMasterExcelImport from "@/components/audit-master/AuditMasterExcelImport";
import AuditMasterLayout from "@/components/AuditMasterLayout";

import { getAuditMasterData } from "@/actions/auditMasterActions";

import { Table, Button, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from "flowbite-react";
import { JarvisLoader } from "@/components/JarvisLogo";

import { useSearchParams } from "next/navigation";

// UI: "Audit Area Types" — backed by the area-categories API / propertyAuditAreaCategoryMaster table
export default function AreaCategoriesPage() {
    const searchParams = useSearchParams();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalItems, setTotalItems] = useState(0);

    const pageNumber = Number(searchParams.get("page")) || 1;
    const perPage = Number(searchParams.get("itemsPerPage")) || 10;
    const searchKey = searchParams.get("searchValue") || undefined;

    const fetchData = async () => {
        setLoading(true);
        const result = await getAuditMasterData("area-categories", {
            pageNumber: pageNumber,
            perPage: perPage,
            searchKey,
            orderBy: "weight",
            sortorder: "asc"
        });

        if (result.success) {
            setData(result.data);
            setTotalItems(result.totalItems || 0);
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
            title="Audit Area Types"
            createPath="/admin/audit-master/area-categories/new"
            searchKeys={["Name"]}
            totalItems={totalItems}
            extraActions={<AuditMasterExcelImport type="area-categories" onDone={fetchData} />}
        >
            <Table hoverable>
                <TableHead>
                  <TableRow>
                      <TableHeadCell>Name</TableHeadCell>
                      <TableHeadCell>Weight</TableHeadCell>
                      <TableHeadCell>Status</TableHeadCell>
                      <TableHeadCell className="text-right">Actions</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y">
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center">
                                <JarvisLoader size="lg" />
                            </TableCell>
                        </TableRow>
                    ) : data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center">No records found</TableCell>
                        </TableRow>
                    ) : (
                        data.map((item) => (
                            <TableRow key={item.id} className="bg-white dark:border-gray-700 dark:bg-gray-800">
                                <TableCell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                                    {item.name}
                                </TableCell>
                                <TableCell>{item.weight}</TableCell>
                                <TableCell>
                                    <AuditMasterStatusToggle
                                        type="area-categories" /* propertyAuditAreaCategoryMaster table */
                                        id={item.id}
                                        initialStatus={item.isActive}
                                    />
                                </TableCell>
                                <TableCell className="flex justify-end">
                                    <div className="flex gap-2">
                                        <a href={`/admin/audit-master/area-categories/${item.id}`}>
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
