import { Card, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, Button } from "flowbite-react";

import Link from "next/link";

import { getProposals } from "@/actions/proposalActions";
import { CUSTOMER_BRANDS } from "@/constants/customerBrands";

import ProposalActionsMenu from "@/components/proposals/ProposalActionsMenu";
import PageBreadcrumb from "@/components/PageBreadcrumb";

import { TABLE_COLUMNS } from "@/constants/proposals";
import { formatAdminDate } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

const MAGO_BREADCRUMBS = {
    list: [
        { href: "/", label: "Home" },
        { href: "/admin", label: "Admin" },
        { href: "/admin/mago-proposals", label: "Mago Proposals" },
    ],
};

export default async function MagoProposalsPage() {
    let proposals: any[] = [];
    try {
        proposals = await getProposals({ brandName: CUSTOMER_BRANDS.MAGO });
    } catch (err) {
        console.error("Error fetching proposals:", err);
    }

    return (
        <div className="flex w-full flex-col">
            <Card className="w-full bg-white dark:bg-gray-800">
                <div className="flex w-full flex-col gap-2">
                    <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Mago Proposals
                    </h5>
                    <div className="flex w-full flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
                        <PageBreadcrumb items={MAGO_BREADCRUMBS.list} className="w-full shrink-0 sm:w-auto" />
                        <div className="flex w-full shrink-0 flex-row items-center justify-end gap-3 sm:w-auto">
                            <Link href="/admin/mago-proposals/create" className="shrink-0">
                                <Button>New</Button>
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
                    <div className="overflow-x-auto">
                        <Table className="min-w-full" hoverable>
                            <TableHead>
                                <TableRow>
                                    {TABLE_COLUMNS.map((col) => (
                                        <TableHeadCell key={col} className="whitespace-nowrap">{col}</TableHeadCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody className="divide-y">
                                {proposals.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={TABLE_COLUMNS.length} className="text-center text-gray-500 py-4">
                                            No proposals found. Create your first one!
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    proposals.map((proposal: any, index: number) => (
                                        <TableRow key={proposal.id} className="bg-white dark:border-gray-700 dark:bg-gray-800">
                                            <TableCell className="whitespace-nowrap text-gray-900 dark:text-white">
                                                {index + 1}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                                                {proposal.customerFirstName} {proposal.customerLastName}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-gray-900 dark:text-white">
                                                <code className="text-xs bg-gray-100 px-2 py-1 rounded dark:bg-gray-700">
                                                    {proposal.slug}
                                                </code>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-gray-900 dark:text-white">
                                                {formatAdminDate(proposal.createdAt, "-")}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-gray-900 dark:text-white">
                                                {proposal.validTill
                                                    ? formatAdminDate(proposal.validTill, "-")
                                                    : "No expiry"}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-gray-900 dark:text-white">
                                                {proposal.propertyCount || 0} properties
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <ProposalActionsMenu
                                                    proposalId={proposal.id}
                                                    slug={proposal.slug}
                                                    brandName={CUSTOMER_BRANDS.MAGO}
                                                    basePath="/admin/mago-proposals"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </Card>
        </div>
    );
}
