/**
 * Calculate straight calculation from daily breakdown
 */
export const calculateStraightCalculation = (dailyBreakdown: any[], commercials: any) => {
  if (!dailyBreakdown || dailyBreakdown.length === 0) {
    return {
      totalBaseRentalCharge: 0,
      extraAdultChargeWithoutGst: 0,
      extraChildChargeWithoutGst: 0,
      totalOwnerDiscount: 0,
      totalMultipleNightsDiscount: 0,
      totalCouponDiscount: 0,
      totalDiscountFromDailyBreakdown: 0,
      totalGst: 0,
      ownerDiscountPercentage: 0,
      multipleNightsDiscountPercentage: 0,
      couponPercentage: 0,
      couponUsed: '',
    }
  }
  
  const totals = dailyBreakdown.reduce((acc: any, day: any) => {
    acc.baseRental += parseFloat(day.baseRentalWithoutGst || 0)
    acc.extraAdult += parseFloat(day.extraAdultGuestChargesWithoutGst || 0)
    acc.extraChild += parseFloat(day.extraChildGuestChargesWithoutGst || 0)
    acc.gst += parseFloat(day.gstAmount || 0)
    acc.ownerDiscount += parseFloat(day.ownerDiscountAmount || 0)
    acc.multipleNightsDiscount += parseFloat(day.multipleNightsDiscountAmount || 0)
    acc.couponDiscount += parseFloat(day.couponDiscountAmount || 0)
    // Total discount per day (matches Daily Breakdown table "Discount" column)
    acc.discountForTheDay += parseFloat(day.discountForTheDay || 0)
    return acc
  }, {
    baseRental: 0,
    extraAdult: 0,
    extraChild: 0,
    gst: 0,
    ownerDiscount: 0,
    multipleNightsDiscount: 0,
    couponDiscount: 0,
    discountForTheDay: 0,
  })
  
  const discountAmount = commercials?.discountAmount || {}
  const subtotal = totals.baseRental + totals.extraAdult + totals.extraChild
  
  return {
    totalBaseRentalCharge: totals.baseRental,
    extraAdultChargeWithoutGst: totals.extraAdult,
    extraChildChargeWithoutGst: totals.extraChild,
    totalOwnerDiscount: totals.ownerDiscount || discountAmount.ownerDiscountValue || 0,
    totalMultipleNightsDiscount: totals.multipleNightsDiscount || discountAmount.multipleNightsDiscountValue || 0,
    totalCouponDiscount: totals.couponDiscount || discountAmount.actualCouponValue || 0,
    /** Sum of discountForTheDay across all days - matches Daily Breakdown table total */
    totalDiscountFromDailyBreakdown: totals.discountForTheDay,
    totalGst: totals.gst,
    ownerDiscountPercentage: discountAmount.ownerDiscountPercentage || 0,
    multipleNightsDiscountPercentage: discountAmount.multipleNightsDiscountPercentage || 0,
    couponPercentage: discountAmount.couponPercentage || 0,
    couponUsed: discountAmount.couponUsed || '',
  }
}

