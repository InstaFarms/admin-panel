import React from 'react'
import { getFormattedCurrency } from '@/utils/bookings/formatting'
import { getThemeColors } from '@/utils/bookings/theme'
import { calculateStraightCalculation } from '@/utils/bookings/calculations'

interface CalculationSectionProps {
  priceDetails: any
  item: any
  bookingDays: number
  guestInfo: any
  isDarkMode?: boolean
}

const CalculationSection: React.FC<CalculationSectionProps> = ({
  priceDetails,
  item,
  bookingDays,
  guestInfo,
  isDarkMode = false
}) => {
  const colors = getThemeColors(isDarkMode)
  
  const renderCalculationRow = (label: string, value: number, isBold = false, isNegative = false) => (
    <div className="flex mb-2.5" style={{ marginBottom: '10px' }}>
      <div className="flex-1" style={{ flex: 1 }}>
        <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
          {label}
        </span>
      </div>
      <div className="text-right" style={{ textAlign: 'right', width: '33%' }}>
        <span
          style={{
            color: colors.textPrimary,
            fontWeight: isBold ? '600' : '500',
            fontSize: isBold ? '15px' : '14px',
          }}
        >
          {isNegative && '-'}{getFormattedCurrency(value)}
        </span>
      </div>
    </div>
  )

  const renderSectionHeader = (title: string, color = colors.accentPrimary) => (
    <h6
      style={{
        color: colors.textPrimary,
        fontWeight: '600',
        marginBottom: '15px',
        fontSize: '16px',
        borderLeft: `4px solid ${color}`,
        paddingLeft: '10px',
      }}
    >
      {title}
    </h6>
  )

  const renderCard = (children: React.ReactNode, variant: 'default' | 'success' | 'warning' | 'info' = 'default') => {
    const cardStyles = {
      default: {
        background: colors.bgPrimary,
        border: `1px solid ${colors.borderPrimary}`,
      },
      success: {
        background: colors.bgSuccess,
        border: `1px solid ${colors.borderSuccess}`,
      },
      warning: {
        background: colors.bgWarning,
        border: `1px solid ${colors.borderWarning}`,
      },
      info: {
        background: colors.bgInfo,
        border: `2px solid ${colors.accentPrimary}`,
        boxShadow: isDarkMode
          ? '0 0 15px rgba(74, 158, 255, 0.3)'
          : '0 0 10px rgba(13, 110, 253, 0.2)',
      },
    }

    const style = cardStyles[variant] || cardStyles.default

    return (
      <div
        style={{
          ...style,
          borderRadius: '6px',
          padding: '15px',
        }}
      >
        {children}
      </div>
    )
  }

  const renderStraightCalculation = () => {
    if (!priceDetails.dailyBreakdown || priceDetails.dailyBreakdown.length === 0) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', background: colors.bgPrimary, borderRadius: '8px', border: `1px solid ${colors.borderPrimary}` }}>
          <div style={{ color: colors.textSecondary, fontSize: '16px' }}>
            No daily breakdown data available for straight calculation
          </div>
        </div>
      )
    }

    const commercials = item?.commercials || {}
    const straightCalc = calculateStraightCalculation(priceDetails.dailyBreakdown, commercials)

    return (
      <div>
        <h5
          style={{
            color: colors.textPrimary,
            fontWeight: '700',
            marginBottom: '20px',
            fontSize: '22px',
            borderLeft: `5px solid ${colors.accentInfo}`,
            paddingLeft: '15px',
            paddingBottom: '10px',
            borderBottom: `2px solid ${colors.borderSecondary}`,
          }}
        >
          Straight Calculation
          <span style={{ fontSize: '13px', marginLeft: '10px', color: colors.textMuted, fontWeight: '400' }}>
            (Calculated from Daily Breakdown - Without GST)
          </span>
        </h5>

        {/* Rental Charges */}
        <div style={{ marginBottom: '20px' }}>
          {renderSectionHeader('Rental Charges', colors.accentPrimary)}
          {renderCard(
            <>
              {renderCalculationRow('Base Rental Charge (Without GST)', straightCalc.totalBaseRentalCharge)}
              {straightCalc.extraAdultChargeWithoutGst > 0 && (
                <div className="flex mb-2.5" style={{ marginBottom: '10px' }}>
                  <div className="flex-1" style={{ flex: 1 }}>
                    <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
                      Extra Adult Guest Charge (Without GST)
                    </span>
                  </div>
                  <div className="text-right" style={{ textAlign: 'right', width: '33%' }}>
                    <span style={{ color: colors.textPrimary, fontWeight: '500', fontSize: '14px' }}>
                      +{getFormattedCurrency(straightCalc.extraAdultChargeWithoutGst)}
                    </span>
                  </div>
                </div>
              )}
              {straightCalc.extraChildChargeWithoutGst > 0 && (
                <div className="flex mb-2.5" style={{ marginBottom: '10px' }}>
                  <div className="flex-1" style={{ flex: 1 }}>
                    <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
                      Extra Child Guest Charge (Without GST)
                    </span>
                  </div>
                  <div className="text-right" style={{ textAlign: 'right', width: '33%' }}>
                    <span style={{ color: colors.textPrimary, fontWeight: '500', fontSize: '14px' }}>
                      +{getFormattedCurrency(straightCalc.extraChildChargeWithoutGst)}
                    </span>
                  </div>
                </div>
              )}
              <hr style={{ margin: '15px 0', borderColor: colors.borderPrimary }} />
              {renderCalculationRow(
                'Subtotal (Before Discounts - Without GST)',
                straightCalc.totalBaseRentalCharge + straightCalc.extraAdultChargeWithoutGst + straightCalc.extraChildChargeWithoutGst,
                true
              )}
            </>
          )}
        </div>
        
        {/* Total Discount - always visible, matches sum of discount column in Daily Breakdown table */}
        <div style={{ marginBottom: '20px' }}>
          {renderSectionHeader('Discount (Total from Daily Breakdown)', colors.accentSuccess)}
          {renderCard(
            <>
              {renderCalculationRow(
                'Total Discount (Without GST)',
                straightCalc.totalDiscountFromDailyBreakdown,
                true,
                true
              )}
              <hr style={{ margin: '15px 0', borderColor: colors.borderSuccess }} />
              {renderCalculationRow(
                'Amount After Discounts (Without GST)',
                (straightCalc.totalBaseRentalCharge + straightCalc.extraAdultChargeWithoutGst + straightCalc.extraChildChargeWithoutGst) -
                  straightCalc.totalDiscountFromDailyBreakdown,
                true
              )}
            </>,
            'success'
          )}
        </div>
        
        {/* Discounts breakdown (itemized) - when any discount type > 0 */}
        {(straightCalc.totalOwnerDiscount > 0 || straightCalc.totalMultipleNightsDiscount > 0 || straightCalc.totalCouponDiscount > 0) && (
          <div style={{ marginBottom: '20px' }}>
            {renderSectionHeader('Discounts Applied (Without GST)', colors.accentSuccess)}
            {renderCard(
              <>
                {straightCalc.totalOwnerDiscount > 0 && (
                  <div className="flex mb-2.5" style={{ marginBottom: '10px' }}>
                    <div className="flex-1" style={{ flex: 1 }}>
                      <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
                        Owner Discount (Sum of All Days)
                        {straightCalc.ownerDiscountPercentage > 0 && (
                          <span style={{ fontSize: '11px', marginLeft: '4px', opacity: 0.7 }}>
                            ({straightCalc.ownerDiscountPercentage}%)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="text-right" style={{ textAlign: 'right', width: '33%' }}>
                      <span style={{ color: colors.accentSuccess, fontWeight: '600', fontSize: '15px' }}>
                        -{getFormattedCurrency(straightCalc.totalOwnerDiscount)}
                      </span>
                    </div>
                  </div>
                )}
                {straightCalc.totalMultipleNightsDiscount > 0 && (
                  <div className="flex mb-2.5" style={{ marginBottom: '10px' }}>
                    <div className="flex-1" style={{ flex: 1 }}>
                      <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
                        Multiple Nights Discount (Sum of All Days)
                        {straightCalc.multipleNightsDiscountPercentage > 0 && (
                          <span style={{ fontSize: '11px', marginLeft: '4px', opacity: 0.7 }}>
                            ({straightCalc.multipleNightsDiscountPercentage}%)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="text-right" style={{ textAlign: 'right', width: '33%' }}>
                      <span style={{ color: colors.accentSuccess, fontWeight: '600', fontSize: '15px' }}>
                        -{getFormattedCurrency(straightCalc.totalMultipleNightsDiscount)}
                      </span>
                    </div>
                  </div>
                )}
                {straightCalc.totalCouponDiscount > 0 && (
                  <div className="flex mb-2.5" style={{ marginBottom: '10px' }}>
                    <div className="flex-1" style={{ flex: 1 }}>
                      <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
                        Coupon Discount (Sum of All Days)
                        {straightCalc.couponUsed && (
                          <span
                            style={{
                              background: colors.accentSuccess,
                              color: isDarkMode ? '#000' : '#fff',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              marginLeft: '5px',
                              fontWeight: '600',
                            }}
                          >
                            {straightCalc.couponUsed}
                          </span>
                        )}
                        {straightCalc.couponPercentage > 0 && (
                          <span style={{ fontSize: '11px', marginLeft: '5px', opacity: 0.7 }}>
                            ({straightCalc.couponPercentage}%)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="text-right" style={{ textAlign: 'right', width: '33%' }}>
                      <span style={{ color: colors.accentSuccess, fontWeight: '600', fontSize: '15px' }}>
                        -{getFormattedCurrency(straightCalc.totalCouponDiscount)}
                      </span>
                    </div>
                  </div>
                )}
                <hr style={{ margin: '15px 0', borderColor: colors.borderSuccess }} />
                {renderCalculationRow(
                  'Total Discount (Without GST)',
                  straightCalc.totalOwnerDiscount + straightCalc.totalMultipleNightsDiscount + straightCalc.totalCouponDiscount,
                  true,
                  true
                )}
                <hr style={{ margin: '15px 0', borderColor: colors.borderSuccess }} />
                {renderCalculationRow(
                  'Amount After Discounts (Without GST)',
                  (straightCalc.totalBaseRentalCharge + straightCalc.extraAdultChargeWithoutGst + straightCalc.extraChildChargeWithoutGst) -
                  (straightCalc.totalOwnerDiscount + straightCalc.totalMultipleNightsDiscount + straightCalc.totalCouponDiscount),
                  true
                )}
              </>,
              'success'
            )}
          </div>
        )}

        {/* Tax */}
        {straightCalc.totalGst > 0 && (
          <div style={{ marginBottom: '20px' }}>
            {renderSectionHeader('Tax Details', colors.accentWarning)}
            {renderCard(
              renderCalculationRow('GST Amount (Sum of Daily GST)', straightCalc.totalGst),
              'warning'
            )}
          </div>
        )}

        {/* Final Amount */}
        <div style={{ marginBottom: '20px' }}>
          {renderCard(
            <>
              <div className="flex">
                <div className="flex-1" style={{ flex: 1 }}>
                  <span style={{ color: colors.textPrimary, fontWeight: '700', fontSize: '18px' }}>
                    Gross Booking Amount (With GST)
                  </span>
                </div>
                <div className="text-right" style={{ textAlign: 'right', width: '33%' }}>
                  <span style={{ color: colors.accentPrimary, fontWeight: '700', fontSize: '20px' }}>
                    {getFormattedCurrency(
                      ((straightCalc.totalBaseRentalCharge + straightCalc.extraAdultChargeWithoutGst + straightCalc.extraChildChargeWithoutGst) -
                      straightCalc.totalDiscountFromDailyBreakdown) +
                      straightCalc.totalGst
                    )}
                  </span>
                </div>
              </div>
              <div
                style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  background: colors.bgPrimary,
                  borderRadius: '4px',
                  border: `1px solid ${colors.borderPrimary}`,
                }}
              >
                <div style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.5' }}>
                  <strong>Note:</strong> This amount is calculated from daily prices. Minor decimal differences can happen because each day is computed individually from the day-wise breakup.
                </div>
              </div>
            </>,
            'info'
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: '30px' }}>
      {renderStraightCalculation()}
    </div>
  )
}

export default CalculationSection

