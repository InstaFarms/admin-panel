"use client";

import { Tooltip } from "flowbite-react";

import { format, formatDistanceToNow, parseISO } from "date-fns";

interface CouponAuditTooltipProps {
    children: React.ReactNode;
    createdAt: string;
    updatedAt: string;
    createdBy?: string | null;
    updatedBy?: string | null;
    adminCreatedBy?: string | null;
    adminUpdatedBy?: string | null;
    adminCreatedByName?: string | null;
    adminUpdatedByName?: string | null;
}

export default function CouponAuditTooltip({
    children,
    createdAt,
    updatedAt,
    createdBy,
    updatedBy,
    adminCreatedBy,
    adminUpdatedBy,
    adminCreatedByName,
    adminUpdatedByName,
}: CouponAuditTooltipProps) {

    const formatDate = (dateString: string) => {
        try {
            return format(parseISO(dateString), "MMM d, yyyy");
        } catch (e) {
            return dateString;
        }
    };

    const formatRelative = (dateString: string) => {
        try {
            return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
        } catch (e) {
            return "";
        }
    };

    const creatorName = adminCreatedByName || (adminCreatedBy ? "Admin" : (createdBy ? "User" : "System"));
    const updatorName = adminUpdatedByName || (adminUpdatedBy ? "Admin" : (updatedBy ? "User" : "System"));

    const tooltipContent = (
        <div className="text-xs text-left p-1 leading-relaxed">
            <div>
                Created by <span className="font-semibold">{creatorName}</span> on {formatDate(createdAt)}
            </div>
            <div>
                Last edited by <span className="font-semibold">{updatorName}</span> on {formatDate(updatedAt)} ({formatRelative(updatedAt)})
            </div>
        </div>
    );

    return (
        <Tooltip content={tooltipContent} style="light" placement="top" arrow={false}>
            <div className="cursor-help w-fit">
                {children}
            </div>
        </Tooltip>
    );
}
