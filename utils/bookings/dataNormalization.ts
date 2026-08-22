/**
 * Normalize booking data to match the expected format for CommercialsTab
 */
export const normalizePriceDetails = (booking: any) => {
  if (!booking) return {}
  
  // Map daywiseBreakup to dailyBreakdown format
  const dailyBreakdown = (booking.daywiseBreakup || []).map((day: any) => ({
    date: day.date,
    day: day.day,
    gstSlab: day.gstSlab || 0,
    gstAmount: day.gstAmount || 0,
    gstValue: day.gstAmount || 0, // Alias for compatibility
    discountForTheDay: day.discountForTheDay || 0,
    baseRentalWithoutGst: day.baseRentalWithoutGst || 0,
    baseRentalWithoutGST: day.baseRentalWithoutGst || 0, // Alias
    extraAdultGuestChargesWithoutGst: day.extraAdultGuestChargesWithoutGst || 0,
    extraChildGuestChargesWithoutGst: day.extraChildGuestChargesWithoutGst || 0,
    bookingAmountAfterDiscountWithGst: day.bookingAmountAfterDiscountWithGst || 0,
    bookingAmountAfterDiscountWithoutGst: day.bookingAmountAfterDiscountWithoutGst || 0,
    bookingAmountWithoutGST: day.bookingAmountAfterDiscountWithoutGst || 0, // Alias
    bookingAmountWithGST: day.bookingAmountAfterDiscountWithGst || 0, // Alias
    bookingAmountWithoutGstBeforeDiscounts: day.bookingAmountWithoutGstBeforeDiscounts || 0,
    ownerDiscountAmount: 0, // Not in the provided data structure
    ownerDiscountPercentage: 0,
  }))
  
  // Calculate totals from daily breakdown
  const totals = dailyBreakdown.reduce((acc: any, day: any) => {
    acc.baseRental += parseFloat(day.baseRentalWithoutGst || 0)
    acc.extraAdult += parseFloat(day.extraAdultGuestChargesWithoutGst || 0)
    acc.extraChild += parseFloat(day.extraChildGuestChargesWithoutGst || 0)
    acc.beforeDiscounts += parseFloat(day.bookingAmountWithoutGstBeforeDiscounts || 0)
    acc.discount += parseFloat(day.discountForTheDay || 0)
    acc.afterDiscount += parseFloat(day.bookingAmountAfterDiscountWithoutGst || 0)
    acc.gst += parseFloat(day.gstAmount || 0)
    acc.withGst += parseFloat(day.bookingAmountAfterDiscountWithGst || 0)
    return acc
  }, {
    baseRental: 0,
    extraAdult: 0,
    extraChild: 0,
    beforeDiscounts: 0,
    discount: 0,
    afterDiscount: 0,
    gst: 0,
    withGst: 0,
  })
  
  return {
    // Summary values
    grossBookingAmount: booking.fullBookingAmountWithGst || 0,
    instafarmsCommission: booking.instafarmsCommission || 0,
    ownersCommissionAfterTDS: booking.amountPayableToOwnerAfterTDS || 0,
    brandName: booking.brandName || '',
    
    // Daily breakdown
    dailyBreakdown,
    
    // Commercials structure (for new format)
    commercials: {
      baseRentalAmountWithGst: booking.baseRentalAmountWithGst || 0,
      extraAdultGuestChargeWithGst: booking.extraAdultGuestChargeWithGst || 0,
      extraChildGuestChargeWithGst: booking.extraChildGuestChargeWithGst || 0,
      bookingAmountWithGstBeforeDiscounts: booking.bookingAmountWithGstBeforeDiscounts || 0,
      totalDiscount: booking.totalDiscountAmount || 0,
      fullBookingAmountWithGst: booking.fullBookingAmountWithGst || 0,
      bookingAmountPaidWithGst: booking.bookingAmountPaidWithGst || 0,
      remainingAmountToBePaidWithGst: booking.remainingAmountToBePaidWithGst || 0,
      isFullPayment: booking.remainingAmountToBePaidWithGst === 0,
      discountAmount: {
        ownerDiscountValue: booking.ownerDiscountValue || 0,
        ownerDiscountPercentage: booking.ownerDiscountPercentage || 0,
        multipleNightsDiscountValue: booking.multipleNightsDiscountValue || 0,
        multipleNightsDiscountPercentage: booking.multipleNightsDiscountPercentage || 0,
        actualCouponValue: booking.couponDiscountValue || 0,
        couponPercentage: 0, // Not in provided data
        couponUsed: booking.couponDiscountCode || '',
        couponType: booking.couponDiscountType || '',
      },
      amountDistribution: {
        instafarmsCommission: booking.instafarmsCommission || 0,
        ownerRevenue: booking.ownerRevenue || 0,
        tds: booking.tds || 0,
        tcsAmount: booking.tcsAmount || 0,
        amountPayableToOwnerAfterTDS: booking.amountPayableToOwnerAfterTDS || 0,
      },
    },
    
    // Guest info
    guestInfo: {
      adult: booking.adultCount || 0,
      children: booking.childrenCount || 0,
      infant: booking.infantCount || 0,
    },
    
    // Booking days
    bookingDays: booking.durationNights || 0,
  }
}

