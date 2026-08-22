import React from 'react'
import { getFormattedCurrency } from '@/utils/bookings/formatting'
import { getThemeColors } from '@/utils/bookings/theme'

interface SummaryCardProps {
  title: string
  value: number | string
  variant?: 'info' | 'success' | 'warning' | 'purple'
  isDarkMode?: boolean
}

const SummaryCard: React.FC<SummaryCardProps> = ({ 
  title, 
  value, 
  variant = 'info', 
  isDarkMode = false 
}) => {
  const colors = getThemeColors(isDarkMode)
  
  const variantStyles = {
    info: {
      background: isDarkMode ? '#1a2a3a' : '#e7f3ff',
      border: `2px solid ${colors.accentPrimary}`,
      color: colors.accentPrimary,
    },
    success: {
      background: isDarkMode ? '#1a3a2a' : '#f0fdf4',
      border: `2px solid ${colors.accentSuccess}`,
      color: colors.accentSuccess,
    },
    warning: {
      background: isDarkMode ? '#3a2a1a' : '#fff4e6',
      border: `2px solid ${colors.accentWarning}`,
      color: colors.accentWarning,
    },
    purple: {
      background: isDarkMode ? '#2a1a3a' : '#f3e8ff',
      border: `2px solid ${colors.accentPurple}`,
      color: colors.accentPurple,
    },
  }
  
  const style = variantStyles[variant] || variantStyles.info
  
  return (
    <div className="w-full md:w-1/3 mb-4 md:mb-0 px-2">
      <div
        style={{
          ...style,
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <div style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '8px' }}>
          {title}
        </div>
        <div
          style={{
            color: style.color,
            fontSize: '24px',
            fontWeight: '700',
          }}
        >
          {getFormattedCurrency(value || 0)}
        </div>
      </div>
    </div>
  )
}

export default SummaryCard

