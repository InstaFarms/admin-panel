import { Badge, Button, Card, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";

import { HiPencil } from "react-icons/hi";

import Link from "next/link";

import Pagination from "@/components/Pagination";
import Searchbar from "@/components/Searchbar";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import CouponFilters from "@/components/coupons/CouponFilters";
import CouponCodeCopy from "@/components/coupons/CouponCodeCopy";
import CouponStatusToggle from "@/components/coupons/CouponStatusToggle";
import CouponAuditTooltip from "@/components/coupons/CouponAuditTooltip";

import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import type { Coupon, ServerPageProps } from "@/utils/types";

import { getCoupons } from "@/actions/couponActions";

import { getEmptyListMessage } from "@/constants/ui";
import { CUSTOMER_BRANDS } from "@/constants/customerBrands";
import { SEARCH_KEYS, TABLE_COLUMNS, COUPON_STATUS_CONFIG, INSTAFARMS_COUPON_BREADCRUMBS } from "@/constants/coupons";

import { getCouponStatusKey, formatDate, formatDiscount } from "@/lib/couponUtils";

export const dynamic = "force-dynamic";

export default async function InstafarmsCouponsPage({ searchParams }: ServerPageProps) {
    const params = await searchParams;
    const { offset } = parseLimitOffset(params);
    const filterParams = parseFilterParams(params);

    const brandName = CUSTOMER_BRANDS.INSTAFARMS;
    const { data, total } = await getCoupons({ ...params, brandName });

    const hasFilters =
        Object.entries(params).some(([k, v]) => v && !["page", "itemsPerPage"].includes(k)) ||
        Boolean(filterParams?.searchValue);

    const emptyMessage = getEmptyListMessage("coupons", hasFilters);

    return (
        <div className="flex w-full flex-col">
            <Card className="w-full bg-white dark:bg-gray-800">
                <div className="flex w-full flex-col gap-2">
                    <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Instafarms Coupons
                    </h5>
                    <div className="flex w-full flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
                        <PageBreadcrumb items={INSTAFARMS_COUPON_BREADCRUMBS.list} className="w-full shrink-0 sm:w-auto" />
                        <div className="flex w-full shrink-0 flex-row items-center justify-end gap-3 sm:w-auto">
                            <div className="min-w-0 flex-1 sm:w-[460px]">
                                <Searchbar
                                    searchKeys={[...SEARCH_KEYS]}
                                    defaultSearchKey={filterParams?.searchKey ?? "Name"}
                                />
                            </div>
                            <CouponFilters />
                            <Link href="/admin/instafarms-coupons/create" className="shrink-0">
                                <Button>New</Button>
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
                    <div className="min-h-[300px] overflow-x-auto">
                        <Table className="min-w-full">
                            <TableHead>
                                <TableRow>
                                    {TABLE_COLUMNS.map((col) => (
                                        <TableHeadCell key={col} className="whitespace-nowrap">{col}</TableHeadCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody className="divide-y text-gray-900 dark:text-white">
                                {data.length > 0 ? (
                                    data.map((coupon, index) => {
                                        const isExpired = new Date(coupon.validUntil) < new Date();
                                        const statusKey = getCouponStatusKey(coupon as Coupon);
                                        const statusCfg = COUPON_STATUS_CONFIG[statusKey];

                                        return (
                                            <TableRow key={coupon.id} className="bg-white dark:border-gray-700 dark:bg-gray-800">
                                                <TableCell className="whitespace-nowrap">{offset + index + 1}</TableCell>
                                                <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                                                    <div className="max-w-[150px] truncate sm:max-w-none">{coupon.name}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <CouponCodeCopy code={coupon.code} />
                                                </TableCell>
                                                <TableCell className="font-medium whitespace-nowrap">
                                                    <div className="flex flex-col gap-1">
                                                        <span>{formatDiscount(coupon as Coupon)}</span>
                                                        {coupon.maxDiscountAmount > 0 && (
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                max ₹{coupon.maxDiscountAmount}
                                                            </span>
                                                        )}
                                                        {coupon.minOrderValue > 0 && (
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                min ₹{coupon.minOrderValue}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    <div className="flex flex-col gap-0.5 text-sm">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">From</span>
                                                        <span className={isExpired ? "text-gray-400" : "text-gray-800 dark:text-gray-200"}>
                                                            {formatDate(coupon.validFrom)}
                                                        </span>
                                                        <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">Until</span>
                                                        <span className={isExpired ? "text-red-400" : "text-gray-800 dark:text-gray-200"}>
                                                            {formatDate(coupon.validUntil)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-center font-semibold">
                                                    {coupon.usedCount}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    <div className="flex flex-col gap-2">
                                                        <CouponStatusToggle
                                                            couponId={coupon.id}
                                                            initialStatus={coupon.isActive}
                                                        />
                                                        <CouponAuditTooltip
                                                            createdAt={coupon.createdAt}
                                                            updatedAt={coupon.updatedAt}
                                                            createdBy={coupon.createdBy}
                                                            updatedBy={coupon.updatedBy}
                                                            adminCreatedBy={coupon.adminCreatedBy}
                                                            adminUpdatedBy={coupon.adminUpdatedBy}
                                                            adminCreatedByName={coupon.adminCreatedByName}
                                                            adminUpdatedByName={coupon.adminUpdatedByName}
                                                        >
                                                            <Badge color={statusCfg.color} title={statusCfg.title}>
                                                                {statusCfg.label}
                                                            </Badge>
                                                        </CouponAuditTooltip>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Link href={`/admin/instafarms-coupons/${coupon.id}`} title="Edit">
                                                        <div className="rounded-md bg-blue-600 p-1 w-fit transition-colors hover:bg-blue-700">
                                                            <HiPencil size={20} className="text-white" />
                                                        </div>
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={TABLE_COLUMNS.length}
                                            className="py-4 text-center text-gray-500 dark:text-gray-400"
                                        >
                                            {emptyMessage}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <Pagination totalItems={total} />
            </Card>
        </div>
    );
}

