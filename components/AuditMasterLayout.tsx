"use client";

import { Button, Card, Breadcrumb, BreadcrumbItem } from "flowbite-react";

import Pagination from "@/components/Pagination";
import Searchbar from "@/components/Searchbar";

import { HiPlus } from "react-icons/hi";
import { ReactNode } from "react";

import Link from "next/link";

interface AuditMasterLayoutProps {
    title: string;
    onAddNew?: () => void;
    createPath?: string;
    searchKeys?: string[];
    totalItems?: number;
    extraActions?: ReactNode;
    children: ReactNode;
}

export default function AuditMasterLayout({
    title,
    onAddNew,
    createPath,
    searchKeys = ["Name"],
    totalItems = 0,
    extraActions,
    children,
}: AuditMasterLayoutProps) {
    return (
        <div className="flex w-full flex-col">
            <Card className="w-full bg-white">
                <div className="space-between flex w-full flex-col gap-4">
                    <div className="flex flex-col sm:flex-row w-full gap-2 items-center justify-between">
                        <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {title}
                        </h5>

                        <div className="flex w-full sm:w-auto gap-2 items-center">
                            {searchKeys.length > 0 && (
                                <div className="min-w-0 flex-1 sm:w-64">
                                    <Searchbar
                                        searchKeys={searchKeys}
                                        defaultSearchKey={searchKeys[0]}
                                    />
                                </div>
                            )}

                            {extraActions}

                            {createPath ? (
                                <Link href={createPath}>
                                    <Button size="sm">
                                        <HiPlus className="mr-2 h-4 w-4" />
                                        New
                                    </Button>
                                </Link>
                            ) : (
                                onAddNew && (
                                    <Button size="sm" onClick={onAddNew}>
                                        <HiPlus className="mr-2 h-4 w-4" />
                                        New
                                    </Button>
                                )
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row">
                        <Breadcrumb className="bg-white pb-3 dark:bg-gray-800">
                            <BreadcrumbItem href="/">Home</BreadcrumbItem>
                            <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
                            <BreadcrumbItem href="#">{title}</BreadcrumbItem>
                        </Breadcrumb>
                    </div>
                </div>

                {/* Content Area (Table) */}
                <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
                    <div className="overflow-x-auto">
                        {children}
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
