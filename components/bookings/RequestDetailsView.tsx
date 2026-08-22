"use client";

import { Badge, Button, Card, Timeline, TimelineItem, TimelinePoint, TimelineContent, TimelineTime, TimelineTitle, TimelineBody, Breadcrumb, BreadcrumbItem } from "flowbite-react";

import { HiCheck, HiX, HiClock, HiCreditCard, HiArrowLeft } from "react-icons/hi";

import Link from "next/link";

type RequestDetailsViewProps = {
    request: any; // Type strictly if shared type available
};

export default function RequestDetailsView({ request }: RequestDetailsViewProps) {
    const isExpired = request.status === "PENDING" && request.expiresAt && new Date(request.expiresAt).getTime() < Date.now();
    const isRejected = request.status === "REJECTED" || request.status === "AUTO_REJECTED";
    const isAccepted = request.status === "CONFIRMED";

    console.log(request);

    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    return (
        <div className="flex w-full flex-col">
            <Card className="w-full bg-white">
                <div className="space-between flex w-full flex-row items-center">
                    <div className="flex w-full flex-col gap-2">
                        <div className="flex flex-row justify-between">
                            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                                Request Details
                            </h5>
                            <div className="flex items-center gap-2">
                                <Link href="/admin/bookings/approval-queue?tab=past">
                                    <Button color="light" size="sm">
                                        <HiArrowLeft className="mr-2 h-4 w-4" />
                                        Back to Queue
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row">
                            <div className="flex-1">
                                <Breadcrumb className="bg-white pb-3 dark:bg-gray-800">
                                    <BreadcrumbItem href="/">Home</BreadcrumbItem>
                                    <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
                                    <BreadcrumbItem href="/admin/bookings">Bookings</BreadcrumbItem>
                                    <BreadcrumbItem href="/admin/bookings/approval-queue">Approval Queue</BreadcrumbItem>
                                    <BreadcrumbItem>Request #{request.id}</BreadcrumbItem>
                                </Breadcrumb>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    {/* Header Section */}
                    <div className="flex items-center justify-between border-b pb-4 dark:border-gray-700">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Booking Request #{request.id}
                            </h2>
                            <p className="text-sm text-gray-500">ID: {request.id}</p>
                        </div>
                        <Badge
                            color={isAccepted ? "success" : isRejected ? "failure" : "warning"}
                            size="lg"
                        >
                            {isExpired ? "EXPIRED" : request.status}
                        </Badge>
                    </div>

                    {/* Basic Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                            <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">Property Information</h3>
                            <div className="space-y-2 text-sm">
                                <p><span className="text-gray-500">Property Name:</span> <span className="font-medium">{request.propertyName}</span></p>
                                <p><span className="text-gray-500">Dates:</span> <span className="font-medium">{request.booking?.checkinDate} - {request.booking?.checkoutDate}</span></p>
                                <p><span className="text-gray-500">Property ID:</span> <span className="font-mono text-xs">{request.booking?.propertyId}</span></p>
                            </div>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                            <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">Customer Information</h3>
                            <div className="space-y-2 text-sm">
                                <p><span className="text-gray-500">Name:</span> <span className="font-medium">{request.guestName}</span></p>
                                {request.customer && (
                                    <>
                                        <p><span className="text-gray-500">Phone:</span> <span className="font-medium">{request.customer.mobileNumber}</span></p>
                                        <p><span className="text-gray-500">Email:</span> <span className="font-medium">{request.customer.email}</span></p>
                                    </>
                                )}
                                <p><span className="text-gray-500">Requested At:</span> <span className="font-medium">{formatDateTime(request.requestedAt)}</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Scenario A: Accepted */}
                    {isAccepted && (
                        <div className="rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20">
                            <h4 className="mb-4 flex items-center gap-2 text-lg font-semibold text-green-800 dark:text-green-200">
                                <HiCheck className="h-6 w-6" /> Accepted Quote
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-800 dark:text-green-200">
                                <div>
                                    <p className="font-medium">Linked Booking</p>
                                    <a
                                        href={`/admin/bookings/${request.bookingId}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-green-700 underline hover:text-green-900 dark:text-green-300"
                                    >
                                        Booking #{request.bookingId}
                                    </a>
                                </div>
                                <div>
                                    <p className="font-medium">Action Taken By</p>
                                    <p>{request.actionTakenBy}</p>
                                </div>
                                <div>
                                    <p className="font-medium">Confirmed At</p>
                                    <p>{formatDateTime(request.confirmedAt)}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Scenario B: Rejected / Auto-Rejected */}
                    {isRejected && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
                            <h4 className="mb-4 flex items-center gap-2 text-lg font-semibold text-red-800 dark:text-red-200">
                                <HiX className="h-6 w-6" /> Rejection Details
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-red-800 dark:text-red-200">
                                <div>
                                    <p className="font-medium">Rejection Reason</p>
                                    <p className="mt-1">{request.rejectionReason}</p>
                                </div>

                                <div className="space-y-2">
                                    <p>
                                        <span className="font-medium">Original Payment ID:</span>{" "}
                                        <span className="font-mono text-xs">{request.paymentId || "N/A"}</span>
                                    </p>
                                    <p>
                                        <span className="font-medium">Refund Status:</span> {request.refundStatus || "N/A"}
                                    </p>
                                    {request.razorpayRefundId && (
                                        <p>
                                            <span className="font-medium">Refund ID:</span>{" "}
                                            <span className="font-mono text-xs">{request.razorpayRefundId}</span>
                                        </p>
                                    )}
                                    {request.refundError && (
                                        <div className="rounded bg-red-100 p-2 text-red-700 dark:bg-red-900 dark:text-red-100">
                                            <p className="font-bold">Refund Error:</p>
                                            <p>{request.refundError}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Timeline */}
                    <div className="border-t pt-6 dark:border-gray-700">
                        <h4 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
                            Request Timeline
                        </h4>
                        <Timeline>
                            <TimelineItem>
                                <TimelinePoint icon={HiClock} />
                                <TimelineContent>
                                    <TimelineTime>{formatDateTime(request.requestedAt)}</TimelineTime>
                                    <TimelineTitle>Request Created</TimelineTitle>
                                    <TimelineBody>
                                        Customer requested to book {request.propertyName}
                                    </TimelineBody>
                                </TimelineContent>
                            </TimelineItem>

                            {/* Hypothetical Payment Event */}
                            {request.booking?.isAdvancePayment && (
                                <TimelineItem>
                                    <TimelinePoint icon={HiCreditCard} />
                                    <TimelineContent>
                                        <TimelineTime>{formatDateTime(request.requestedAt)}</TimelineTime>
                                        <TimelineTitle>Payment Authorized</TimelineTitle>
                                        <TimelineBody>Advance payment captured successfully.</TimelineBody>
                                    </TimelineContent>
                                </TimelineItem>
                            )}

                            {isAccepted && (
                                <TimelineItem>
                                    <TimelinePoint icon={HiCheck} />
                                    <TimelineContent>
                                        <TimelineTime>{formatDateTime(request.confirmedAt)}</TimelineTime>
                                        <TimelineTitle>Request Accepted</TimelineTitle>
                                        <TimelineBody>
                                            Accepted by {request.confirmedBy || "Owner"}
                                        </TimelineBody>
                                    </TimelineContent>
                                </TimelineItem>
                            )}

                            {isRejected && (
                                <TimelineItem>
                                    <TimelinePoint icon={HiX} />
                                    <TimelineContent>
                                        <TimelineTime>{formatDateTime(request.rejectedAt)}</TimelineTime>
                                        <TimelineTitle>
                                            {request.status === "AUTO_REJECTED" ? "Auto Rejected" : "Rejected"}
                                        </TimelineTitle>
                                        <TimelineBody>
                                            Reason: {request.rejectionReason}
                                            <br />
                                            By: {request.actionTakenBy}
                                        </TimelineBody>
                                    </TimelineContent>
                                </TimelineItem>
                            )}
                        </Timeline>
                    </div>
                </div>
            </Card>
        </div>
    );
}
