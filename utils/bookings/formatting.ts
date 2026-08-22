import {
  formatAdminDate,
  formatAdminDateTime,
  parseAdminDateTime,
} from "@/lib/dateUtils";

/**
 * Format currency amount to Indian Rupee format
 */
export const getFormattedCurrency = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined || amount === '') {
    return '₹0'
  }
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) {
    return '₹0'
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount)
}

/**
 * Format date to readable string
 */
export const formattedDate = (dateString: string | Date | null | undefined): string => {
  return formatAdminDate(dateString)
}

/**
 * Format date for display in tables
 */
export const formatDateForDisplay = (dateString: string | Date | null | undefined): string => {
  const date = parseAdminDateTime(dateString)
  return date ? date.toFormat('cccc, dd LLL yyyy') : 'N/A'
}

/**
 * Format date and time consistently for server and client
 * Uses a fixed format to avoid hydration mismatches
 */
export const formatDateTime = (dateString: string | Date | null | undefined): string => {
  return formatAdminDateTime(dateString)
}

/**
 * Format time elapsed since a booking was created using up to two units.
 * Examples: 2 min 29 sec, 2 day 7 hour, 1 year 3 month
 */
export const formatTimeSinceBooking = (
  dateString: string | Date | null | undefined,
  now: Date = new Date()
): string => {
  if (!dateString) return 'N/A'

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    if (isNaN(date.getTime())) return 'N/A'

    const diffMs = Math.max(0, now.getTime() - date.getTime())
    const diffSeconds = Math.floor(diffMs / 1000)

    const formatUnit = (value: number, unit: string): string =>
      `${value} ${unit}${value === 1 ? '' : 's'}`

    const yearSeconds = 365 * 24 * 60 * 60
    const monthSeconds = 30 * 24 * 60 * 60
    const daySeconds = 24 * 60 * 60
    const hourSeconds = 60 * 60
    const minuteSeconds = 60

    const units = [
      { label: 'year', seconds: yearSeconds },
      { label: 'month', seconds: monthSeconds },
      { label: 'day', seconds: daySeconds },
      { label: 'hour', seconds: hourSeconds },
      { label: 'min', seconds: minuteSeconds },
      { label: 'sec', seconds: 1 },
    ]

    let remainingSeconds = diffSeconds
    const parts: string[] = []

    for (const unit of units) {
      if (parts.length === 2) break

      const value = Math.floor(remainingSeconds / unit.seconds)
      if (value <= 0) continue

      parts.push(formatUnit(value, unit.label))
      remainingSeconds -= value * unit.seconds
    }

    return parts.length > 0 ? parts.join(' ') : formatUnit(0, 'sec')
  } catch {
    return 'N/A'
  }
}

