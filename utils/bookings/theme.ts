/**
 * Get theme colors based on dark mode
 */
export const getThemeColors = (isDarkMode: boolean = false) => {
  if (isDarkMode) {
    return {
      // Background colors
      bgPrimary: '#1e293b',
      bgSecondary: '#0f172a',
      bgCard: '#1e293b',
      bgSuccess: '#1a3a2a',
      bgWarning: '#3a2a1a',
      bgInfo: '#1a2a3a',
      bgPurple: '#2a1a3a',
      bgError: '#3a1a1a',
      
      // Text colors
      textPrimary: '#f1f5f9',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      
      // Border colors
      borderPrimary: '#334155',
      borderSecondary: '#475569',
      borderSuccess: '#22c55e',
      borderWarning: '#f59e0b',
      borderInfo: '#3b82f6',
      borderPurple: '#a855f7',
      
      // Accent colors
      accentPrimary: '#3b82f6',
      accentSuccess: '#22c55e',
      accentWarning: '#f59e0b',
      accentError: '#ef4444',
      accentInfo: '#06b6d4',
      accentPurple: '#a855f7',
    }
  } else {
    return {
      // Background colors
      bgPrimary: '#ffffff',
      bgSecondary: '#f8fafc',
      bgCard: '#ffffff',
      bgSuccess: '#f0fdf4',
      bgWarning: '#fff4e6',
      bgInfo: '#eff6ff',
      bgPurple: '#f3e8ff',
      bgError: '#fef2f2',
      
      // Text colors
      textPrimary: '#1e293b',
      textSecondary: '#64748b',
      textMuted: '#94a3b8',
      
      // Border colors
      borderPrimary: '#e2e8f0',
      borderSecondary: '#cbd5e1',
      borderSuccess: '#22c55e',
      borderWarning: '#f59e0b',
      borderInfo: '#3b82f6',
      borderPurple: '#a855f7',
      
      // Accent colors
      accentPrimary: '#3b82f6',
      accentSuccess: '#22c55e',
      accentWarning: '#f59e0b',
      accentError: '#ef4444',
      accentInfo: '#06b6d4',
      accentPurple: '#a855f7',
    }
  }
}

