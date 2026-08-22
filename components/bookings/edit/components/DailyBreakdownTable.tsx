import React from 'react'
import { getFormattedCurrency } from '@/utils/bookings/formatting'
import { formatDateForDisplay } from '@/utils/bookings/formatting'
import { getThemeColors } from '@/utils/bookings/theme'

interface DailyBreakdownTableProps {
  dailyBreakdown: any[]
  isDarkMode?: boolean
}

const DailyBreakdownTable: React.FC<DailyBreakdownTableProps> = ({ 
  dailyBreakdown, 
  isDarkMode = false 
}) => {
  const colors = getThemeColors(isDarkMode)
  
  if (!dailyBreakdown || !Array.isArray(dailyBreakdown) || dailyBreakdown.length === 0) {
    return null
  }
  
  const hasOwnerDiscount = dailyBreakdown.some(day => day.ownerDiscountAmount > 0)
  
  const totals = dailyBreakdown.reduce((acc, day) => {
    acc.baseRental += parseFloat(day.baseRentalWithoutGst || 0)
    acc.extraAdult += parseFloat(day.extraAdultGuestChargesWithoutGst || 0)
    acc.extraChild += parseFloat(day.extraChildGuestChargesWithoutGst || 0)
    acc.beforeDiscounts += parseFloat(day.bookingAmountWithoutGstBeforeDiscounts || 0)
    acc.discount += parseFloat(day.discountForTheDay || 0)
    acc.afterDiscount += parseFloat(day.bookingAmountWithoutGST || day.bookingAmountAfterDiscountWithoutGst || 0)
    acc.gst += parseFloat(day.gstValue || day.gstAmount || 0)
    acc.withGst += parseFloat(day.bookingAmountWithGST || day.bookingAmountAfterDiscountWithGst || 0)
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
  
  const tableHeaderStyle: React.CSSProperties = {
    padding: '16px 14px',
    textAlign: 'left',
    color: colors.accentPrimary,
    fontWeight: '700',
    fontSize: '14px',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
  }
  
  const tableCellStyle: React.CSSProperties = {
    padding: '14px',
    color: colors.textPrimary,
    fontWeight: '500',
  }
  
  return (
    <div style={{ marginBottom: '25px' }}>
      <h6
        style={{
          color: colors.textPrimary,
          fontWeight: '600',
          marginBottom: '15px',
          fontSize: '16px',
          borderLeft: `4px solid ${colors.accentInfo}`,
          paddingLeft: '10px',
        }}
      >
        Daily Breakdown
      </h6>
      <div
        style={{
          background: isDarkMode ? '#1e293b' : '#eff6ff',
          borderRadius: '8px',
          padding: '20px',
          border: `1px solid ${colors.borderInfo}`,
          boxShadow: isDarkMode ? '0 4px 12px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div style={{ overflowX: 'auto', borderRadius: '8px' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              fontSize: '14px',
              borderRadius: '8px',
              overflow: 'hidden',
              background: isDarkMode ? '#0f172a' : '#ffffff',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: `3px solid ${colors.accentPrimary}`,
                  backgroundColor: isDarkMode ? '#1e293b' : '#e7f3ff',
                  fontWeight: '700',
                }}
              >
                <th style={{ ...tableHeaderStyle }}>Date</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>GST Slab</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right', minWidth: '280px' }}>
                  Booking Amount
                  <div style={{ fontSize: '12px', fontWeight: '400', color: colors.textMuted, marginTop: '4px', textTransform: 'none', lineHeight: '1.3' }}>
                    (Before Discounts)
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: '400', color: colors.textMuted, marginTop: '4px', textTransform: 'none', lineHeight: '1.3' }}>
                    Base Rental + Extra Adult + Extra Child
                  </div>
                </th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>
                  Discount
                  <div style={{ fontSize: '12px', fontWeight: '400', color: colors.textMuted, marginTop: '4px', textTransform: 'none', lineHeight: '1.3' }}>
                    daywise
                  </div>
                </th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>
                  Booking Amount
                  <div style={{ fontSize: '12px', fontWeight: '400', color: colors.textMuted, marginTop: '4px', textTransform: 'none', lineHeight: '1.3' }}>
                    (After Discount)
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '400', color: colors.textMuted, marginTop: '4px', textTransform: 'none', lineHeight: '1.3' }}>
                    (Without GST)
                  </div>
                </th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>GST</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>
                  Amount
                  <div style={{ fontSize: '12px', fontWeight: '400', color: colors.textMuted, marginTop: '4px', textTransform: 'none', lineHeight: '1.3' }}>
                    (Incl. GST)
                  </div>
                </th>
                {hasOwnerDiscount && (
                  <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Owner Discount</th>
                )}
              </tr>
            </thead>
            <tbody>
              {dailyBreakdown.map((day, index) => {
                const formattedDateStr = formatDateForDisplay(day.date) || `Day ${index + 1}`
                const isEvenRow = index % 2 === 0
                
                return (
                  <tr
                    key={index}
                    style={{
                      borderBottom: `1px solid ${colors.borderSecondary}`,
                      backgroundColor: isEvenRow 
                        ? (isDarkMode ? '#0f172a' : '#ffffff')
                        : (isDarkMode ? '#1e293b' : '#f8fafc'),
                      transition: 'all 0.2s ease',
                      cursor: 'default',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? '#1e3a5a' : '#e7f3ff'
                      e.currentTarget.style.transform = 'scale(1.01)'
                      e.currentTarget.style.boxShadow = isDarkMode 
                        ? '0 2px 8px rgba(74, 158, 255, 0.2)' 
                        : '0 2px 8px rgba(13, 110, 253, 0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isEvenRow 
                        ? (isDarkMode ? '#0f172a' : '#ffffff')
                        : (isDarkMode ? '#1e293b' : '#f8fafc')
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <td style={{ ...tableCellStyle }}>{formattedDateStr}</td>
                    <td style={{ ...tableCellStyle, textAlign: 'right' }}>{day.gstSlab || 0}%</td>
                    <td style={{ ...tableCellStyle, textAlign: 'right', whiteSpace: 'nowrap', fontSize: '13px' }}>
                      {getFormattedCurrency(day.baseRentalWithoutGst || 0)}
                      <span style={{ color: colors.accentSuccess, fontSize: '12px', fontWeight: 'bold', margin: '0 4px' }}>+</span>
                      {getFormattedCurrency(day.extraAdultGuestChargesWithoutGst || 0)}
                      <span style={{ color: colors.accentSuccess, fontSize: '12px', fontWeight: 'bold', margin: '0 4px' }}>+</span>
                      {getFormattedCurrency(day.extraChildGuestChargesWithoutGst || 0)}
                      <span style={{ color: colors.accentSuccess, fontSize: '12px', fontWeight: 'bold', margin: '0 4px' }}>=</span>
                      <span style={{ fontWeight: '700', fontSize: '14px' }}>
                        {getFormattedCurrency(day.bookingAmountWithoutGstBeforeDiscounts || 0)}
                      </span>
                    </td>
                    <td style={{ ...tableCellStyle, textAlign: 'right', color: colors.accentSuccess, whiteSpace: 'nowrap' }}>
                      {day.discountForTheDay > 0 ? (
                        <span>-{getFormattedCurrency(day.discountForTheDay || 0)}</span>
                      ) : (
                        <span style={{ color: colors.textMuted }}>-</span>
                      )}
                    </td>
                    <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                      {getFormattedCurrency(day.bookingAmountWithoutGST || day.bookingAmountAfterDiscountWithoutGst || 0)}
                    </td>
                    <td style={{ ...tableCellStyle, textAlign: 'right', color: colors.accentWarning }}>
                      {getFormattedCurrency(day.gstValue || day.gstAmount || 0)}
                    </td>
                    <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: '600' }}>
                      {getFormattedCurrency(day.bookingAmountWithGST || day.bookingAmountAfterDiscountWithGst || 0)}
                    </td>
                    {hasOwnerDiscount && (
                      <td style={{ ...tableCellStyle, textAlign: 'right', color: colors.accentSuccess }}>
                        {day.ownerDiscountAmount > 0 ? (
                          <>
                            -{getFormattedCurrency(day.ownerDiscountAmount || 0)}
                            {day.ownerDiscountPercentage > 0 && (
                              <span style={{ fontSize: '12px', marginLeft: '4px' }}>
                                ({day.ownerDiscountPercentage}%)
                              </span>
                            )}
                          </>
                        ) : (
                          <span style={{ color: colors.textMuted }}>-</span>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr
                style={{
                  borderTop: `3px solid ${colors.accentPrimary}`,
                  backgroundColor: isDarkMode ? '#1e293b' : '#e7f3ff',
                  fontWeight: '700',
                  boxShadow: isDarkMode 
                    ? '0 -4px 12px rgba(74, 158, 255, 0.2)' 
                    : '0 -4px 12px rgba(13, 110, 253, 0.15)',
                }}
              >
                <td colSpan={2} style={{ ...tableCellStyle, textAlign: 'right', color: colors.accentPrimary, fontSize: '15px', letterSpacing: '0.5px' }}>
                  Totals:
                </td>
                <td style={{ ...tableCellStyle, textAlign: 'right', whiteSpace: 'nowrap', fontSize: '13px' }}>
                  {getFormattedCurrency(totals.baseRental)}
                  <span style={{ color: colors.accentSuccess, fontSize: '12px', fontWeight: 'bold', margin: '0 4px' }}>+</span>
                  {getFormattedCurrency(totals.extraAdult)}
                  <span style={{ color: colors.accentSuccess, fontSize: '12px', fontWeight: 'bold', margin: '0 4px' }}>+</span>
                  {getFormattedCurrency(totals.extraChild)}
                  <span style={{ color: colors.accentSuccess, fontSize: '12px', fontWeight: 'bold', margin: '0 4px' }}>=</span>
                  <span style={{ fontWeight: '700', fontSize: '14px' }}>
                    {getFormattedCurrency(totals.beforeDiscounts)}
                  </span>
                </td>
                <td style={{ ...tableCellStyle, textAlign: 'right', color: colors.accentSuccess, whiteSpace: 'nowrap', fontSize: '15px' }}>
                  -{getFormattedCurrency(totals.discount)}
                </td>
                <td style={{ ...tableCellStyle, textAlign: 'right', color: colors.accentPrimary, fontSize: '15px' }}>
                  {getFormattedCurrency(totals.afterDiscount)}
                </td>
                <td style={{ ...tableCellStyle, textAlign: 'right', color: colors.accentWarning, fontSize: '15px' }}>
                  {getFormattedCurrency(totals.gst)}
                </td>
                <td style={{ ...tableCellStyle, textAlign: 'right', color: colors.accentPrimary, fontSize: '16px' }}>
                  {getFormattedCurrency(totals.withGst)}
                </td>
                {hasOwnerDiscount && (
                  <td style={{ ...tableCellStyle, textAlign: 'right', fontSize: '15px' }}></td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

export default DailyBreakdownTable

