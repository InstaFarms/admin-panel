import React from 'react'
import { getFormattedCurrency, formattedDate } from '@/utils/bookings/formatting'
import { normalizePriceDetails } from '@/utils/bookings/dataNormalization'
import { getThemeColors } from '@/utils/bookings/theme'
import SummaryCard from './SummaryCard'
import DailyBreakdownTable from './DailyBreakdownTable'
import CalculationSection from './CalculationSection'

interface CommercialsTabProps {
  item: any
  isDarkMode?: boolean
}

const CommercialsTab: React.FC<CommercialsTabProps> = ({ 
  item, 
  isDarkMode = false 
}) => {
  const colors = getThemeColors(isDarkMode)
  
  if (!item) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: colors.textSecondary }}>
        Loading booking data...
      </div>
    )
  }

  // Normalize the booking data to match expected format
  const priceDetails = normalizePriceDetails(item)
  
  if (!priceDetails || Object.keys(priceDetails).length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: colors.textSecondary }}>
        No commercial data available for this booking.
      </div>
    )
  }
  
  const commercials = (priceDetails.commercials || {}) as Record<string, any>
  const amountDistribution = (commercials.amountDistribution || {}) as Record<string, any>
  const commissionLabel = `${priceDetails.brandName || (item as any).brandName || 'Platform'} Commission`

  return (
    <>
      {/* Header Section */}
      <div style={{ borderBottom: `2px solid ${colors.borderPrimary}`, paddingBottom: '20px', marginBottom: '30px' }}>
        <h5 style={{ margin: 0, color: colors.textPrimary, fontWeight: '600' }}>
          Commercial Details
        </h5>
        <p style={{ margin: '5px 0 0 0', color: colors.textSecondary, fontSize: '14px' }}>
          Booking ID: {item.id || 'N/A'} | Booking Period: {item.checkinDate ? formattedDate(item.checkinDate) : 'N/A'} to {item.checkoutDate ? formattedDate(item.checkoutDate) : 'N/A'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="flex flex-wrap -mx-2 mb-6" style={{ marginBottom: '25px' }}>
        <SummaryCard 
          title="Gross Booking Amount" 
          value={priceDetails.grossBookingAmount || 0} 
          variant="info" 
          isDarkMode={isDarkMode} 
        />
        <SummaryCard
          title={commissionLabel}
          value={priceDetails.instafarmsCommission || 0}
          variant="purple" 
          isDarkMode={isDarkMode} 
        />
        <SummaryCard 
          title="Owner Commission (After TDS)" 
          value={priceDetails.ownersCommissionAfterTDS || 0} 
          variant="success" 
          isDarkMode={isDarkMode} 
        />
      </div>

      {/* Daily Breakdown Section */}
      {priceDetails.dailyBreakdown && 
       Array.isArray(priceDetails.dailyBreakdown) && 
       priceDetails.dailyBreakdown.length > 0 && (
        <DailyBreakdownTable dailyBreakdown={priceDetails.dailyBreakdown} isDarkMode={isDarkMode} />
      )}

      {/* Calculation Section */}
      <CalculationSection
        priceDetails={priceDetails}
        item={item}
        bookingDays={priceDetails.bookingDays || 0}
        guestInfo={priceDetails.guestInfo || {}}
        isDarkMode={isDarkMode}
      />

      {/* Payment Breakdown and Revenue Breakdown */}
      {(() => {
        const fullBookingAmountWithGst = commercials.fullBookingAmountWithGst || 0
        const bookingAmountPaidWithGst = commercials.bookingAmountPaidWithGst || 0
        const remainingAmountToBePaidWithGst = commercials.remainingAmountToBePaidWithGst || 0
        const isFullPayment = commercials.isFullPayment !== undefined ? commercials.isFullPayment : (remainingAmountToBePaidWithGst === 0)
        const advancePayment = bookingAmountPaidWithGst
        const balanceAmount = remainingAmountToBePaidWithGst
        const advancePaymentPercentage = fullBookingAmountWithGst > 0 ? (bookingAmountPaidWithGst / fullBookingAmountWithGst) * 100 : 0

        const instafarmsCommission = amountDistribution.instafarmsCommission || 0
        const ownerRevenue = amountDistribution.ownerRevenue || 0
        const tdsDeducted = amountDistribution.tds || 0
        const tcsDeducted = amountDistribution.tcsAmount || 0
        const ownerRevenueAfterTDS = amountDistribution.amountPayableToOwnerAfterTDS || 0

        return (
          <>
            {/* Payment Breakdown Section */}
            {(advancePayment !== undefined || balanceAmount !== undefined) && (
              <div style={{ marginBottom: '25px' }}>
                <h6 style={{ color: colors.textPrimary, fontWeight: '600', marginBottom: '15px', fontSize: '16px', borderLeft: `4px solid ${colors.accentPurple}`, paddingLeft: '10px' }}>
                  Payment Breakdown
                  {isFullPayment && (
                    <span style={{ background: colors.accentSuccess, color: isDarkMode ? '#000' : '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', marginLeft: '10px', fontWeight: '600' }}>
                      ✓ Full Payment
                    </span>
                  )}
                </h6>
                <div style={{ background: colors.bgPrimary, borderRadius: '6px', padding: '15px', border: `1px solid ${colors.borderPrimary}` }}>
                  <div className="flex mb-2.5" style={{ marginBottom: '10px' }}>
                    <div className="flex-1" style={{ flex: 1, color: colors.textSecondary, fontSize: '14px' }}>
                      Advance Payment
                      {advancePaymentPercentage > 0 && ` (${advancePaymentPercentage.toFixed(2)}%)`}
                    </div>
                    <div className="text-right" style={{ textAlign: 'right', color: colors.accentSuccess, fontWeight: '600', fontSize: '15px' }}>
                      {getFormattedCurrency(advancePayment)}
                    </div>
                  </div>
                  <div className="flex">
                    <div className="flex-1" style={{ flex: 1, color: colors.textSecondary, fontSize: '14px' }}>
                      Balance Amount
                    </div>
                    <div className="text-right" style={{ textAlign: 'right', color: balanceAmount > 0 ? colors.accentError : colors.accentSuccess, fontWeight: '600', fontSize: '15px' }}>
                      {getFormattedCurrency(balanceAmount)}
                    </div>
                  </div>
                  <hr style={{ margin: '15px 0', borderColor: colors.borderPrimary }} />
                  <div className="flex">
                    <div className="flex-1" style={{ flex: 1, color: colors.textPrimary, fontWeight: '600', fontSize: '15px' }}>
                      Total Amount
                    </div>
                    <div className="text-right" style={{ textAlign: 'right', color: colors.textPrimary, fontWeight: '600', fontSize: '15px' }}>
                      {getFormattedCurrency(advancePayment + balanceAmount)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Revenue Breakdown Section */}
            {(instafarmsCommission !== undefined || ownerRevenue !== undefined || ownerRevenueAfterTDS !== undefined) && (
              <div style={{ marginBottom: '25px' }}>
                <h6 style={{ color: colors.textPrimary, fontWeight: '600', marginBottom: '15px', fontSize: '16px', borderLeft: `4px solid ${colors.accentPurple}`, paddingLeft: '10px' }}>
                  Revenue Breakdown
                </h6>
                <div style={{ background: colors.bgPurple, borderRadius: '6px', padding: '15px', border: `1px solid ${colors.borderPurple}` }}>
                  {instafarmsCommission !== undefined && instafarmsCommission > 0 && (
                    <div className="flex mb-2.5" style={{ marginBottom: '10px' }}>
                      <div className="flex-1" style={{ flex: 1, color: colors.textSecondary, fontSize: '14px' }}>
                        {commissionLabel}
                      </div>
                      <div className="text-right" style={{ textAlign: 'right', color: colors.accentPurple, fontWeight: '600', fontSize: '15px' }}>
                        {getFormattedCurrency(instafarmsCommission)}
                      </div>
                    </div>
                  )}
                  {ownerRevenue !== undefined && ownerRevenue > 0 && (
                    <div className="flex mb-2.5" style={{ marginBottom: '10px' }}>
                      <div className="flex-1" style={{ flex: 1, color: colors.textSecondary, fontSize: '14px' }}>
                        Owner Revenue (Before TDS)
                      </div>
                      <div className="text-right" style={{ textAlign: 'right', color: colors.textPrimary, fontWeight: '600', fontSize: '15px' }}>
                        {getFormattedCurrency(ownerRevenue)}
                      </div>
                    </div>
                  )}
                  {ownerRevenueAfterTDS !== undefined && (
                    <>
                      <hr style={{ margin: '15px 0', borderColor: colors.borderPurple }} />
                      <div className="flex">
                        <div className="flex-1" style={{ flex: 1, color: colors.textPrimary, fontWeight: '700', fontSize: '16px' }}>
                          Owner Revenue (After TDS)
                        </div>
                        <div className="text-right" style={{ textAlign: 'right', color: colors.accentSuccess, fontWeight: '700', fontSize: '17px' }}>
                          {getFormattedCurrency(ownerRevenueAfterTDS)}
                        </div>
                      </div>
                      {tdsDeducted > 0 && (
                        <div className="text-right" style={{ textAlign: 'right', marginTop: '8px' }}>
                          <span style={{ color: colors.textSecondary, fontSize: '12px', fontStyle: 'italic' }}>
                            TDS Deducted: {getFormattedCurrency(tdsDeducted)}
                          </span>
                        </div>
                      )}
                      {tcsDeducted > 0 && (
                        <div className="text-right" style={{ textAlign: 'right', marginTop: '4px' }}>
                          <span style={{ color: colors.textSecondary, fontSize: '12px', fontStyle: 'italic' }}>
                            TCS Deducted: {getFormattedCurrency(tcsDeducted)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )
      })()}
    </>
  )
}

export default CommercialsTab

