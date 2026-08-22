import { Coupon } from "@/utils/types";

import { COUPON_STATUS_CONFIG } from "@/constants/coupons";
import { formatAdminDate } from "@/lib/dateUtils";

export function getCouponStatusKey(coupon: Coupon): keyof typeof COUPON_STATUS_CONFIG {
    const now = new Date();
    if (!coupon.isActive) return "inactive";
    if (new Date(coupon.validUntil) < now) return "expired";
    if (new Date(coupon.validFrom) > now) return "scheduled";
    return "active";
}

export function formatDiscount(coupon: Coupon): string {
    if (coupon.discountPercentage) return `${coupon.discountPercentage}%`;
    if (coupon.flatDiscount) return `₹${coupon.flatDiscount}`;
    return "N/A";
}

export function formatDate(dateStr: string): string {
    return formatAdminDate(dateStr);
}
