import ApprovalQueueTable from "@/components/bookings/ApprovalQueueTable";
import PastRequestsTable from "@/components/bookings/PastRequestsTable";
import ApprovalQueueTabs from "@/components/bookings/ApprovalQueueTabs";

import { isAdmin } from "@/utils/admin-only";

import { getPendingBookingConfirmations, getPastBookingConfirmations } from "@/actions/bookingConfirmationActions";

import AuthErrorHandler from "../../AuthErrorHandler";

import { Breadcrumb, BreadcrumbItem, Card } from "flowbite-react";

export const dynamic = "force-dynamic";

export default async function ApprovalQueuePage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const searchParams = await props.searchParams;
    let err: string = "";
    const admin = await isAdmin().catch((error) => {
        if (error instanceof Error) {
            err = error.message;
        }
    });

    if (!admin) {
        return (
            <div className="flex min-h-screen w-full items-center justify-center bg-slate-200 p-4 text-center text-black dark:bg-gray-900 dark:text-white">
                <div className="space-y-4">
                    <h4 className="text-lg">
                        {err || "This account does not have admin access."}
                    </h4>
                    <AuthErrorHandler errorMessage={err} />
                </div>
            </div>
        );
    }

    // Determine current tab
    const tab = typeof searchParams.tab === 'string' ? searchParams.tab : 'pending';

    // Fetch data based on tab
    let data = [];
    if (tab === 'past') {
        data = await getPastBookingConfirmations();
    } else {
        data = await getPendingBookingConfirmations();
    }

    return (
        <div className="flex w-full flex-col">
            <Card className="w-full bg-white">
                <div className="space-between flex w-full flex-row items-center">
                    <div className="flex w-full flex-col gap-2">
                        <div className="flex flex-row justify-between">
                            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                                Approval Queue
                            </h5>
                        </div>

                        <div className="flex flex-col sm:flex-row">
                            <div className="flex-1">
                                <Breadcrumb className="bg-white pb-3 dark:bg-gray-800">
                                    <BreadcrumbItem href="/">Home</BreadcrumbItem>
                                    <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
                                    <BreadcrumbItem href="/admin/bookings">Bookings</BreadcrumbItem>
                                    <BreadcrumbItem href="#">Approval Queue</BreadcrumbItem>
                                </Breadcrumb>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full">
                    <ApprovalQueueTabs />

                    <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
                        {tab === 'past' ? (
                            <PastRequestsTable data={data} />
                        ) : (
                            <ApprovalQueueTable initialData={data} />
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}
