import { Coupon } from './types';

export interface CouponCalculationOptions {
    bookingDates?: Date[];
    propertyId?: string;
    customerBookingStatuses?: string[]; // Statuses of previous bookings for this user
}

export const calculateCouponDiscount = (
    coupon: Coupon,
    bookingAmount: number,
    options?: CouponCalculationOptions
): number => {
    // 1. Status Check
    if (!coupon.isActive) return 0;

    // 2. Date Check (Expiry)
    const now = new Date();
    if (now < new Date(coupon.validFrom)) {
        return 0;
    }

    if (now > new Date(coupon.validUntil)) {
        return 0;
    }

    // 3. Property Match Check
    if (options?.propertyId && coupon.entityIds && coupon.entityIds.length > 0) {
        if (!coupon.entityIds.includes(options.propertyId)) {
            return 0;
        }
    }

    // 4. Day Check
    if (options?.bookingDates && options.bookingDates.length > 0 && coupon.applicableDays && coupon.applicableDays.length > 0) {
        const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const allowedDays = coupon.applicableDays.map((d: string) => d.toLowerCase());

        for (const date of options.bookingDates) {
            const dayName = daysOfWeek[date.getDay()];
            if (dayName && !allowedDays.includes(dayName)) {
                return 0;
            }
        }
    }

    // 5. Min Order Value Check
    if (coupon.minOrderValue > 0 && bookingAmount < coupon.minOrderValue) {
        return 0;
    }

    // 6. New User Check
    if (coupon.newUsersOnly && options?.customerBookingStatuses) {
        const hasPreviousBookings = options.customerBookingStatuses.some(status =>
            ["confirmed", "completed"].includes(status.toLowerCase())
        );

        if (hasPreviousBookings) {
            return 0;
        }
    }

    // 7. Calculate discount
    let discountAmount = 0;

    if (coupon.flatDiscount) {
        discountAmount = Math.min(coupon.flatDiscount, bookingAmount);
    } else if (coupon.discountPercentage) {
        const percent = parseFloat(coupon.discountPercentage);
        const calculatedAmount = (bookingAmount * percent) / 100;

        if (coupon.maxDiscountAmount > 0) {
            discountAmount = Math.min(calculatedAmount, coupon.maxDiscountAmount);
        } else {
            discountAmount = calculatedAmount;
        }
    }

    return Math.round(discountAmount * 100) / 100;
};
