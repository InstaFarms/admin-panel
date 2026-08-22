import { useState, useEffect } from "react"

/**
 * Custom hook to detect dark mode
 * Works with Flowbite's ThemeModeScript which manages the `dark` class on the <html> element.
 * Returns true when the `dark` class is present, otherwise false.
 */
export const useDarkMode = (): boolean => {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const checkDarkMode = () => {
      const html = document.documentElement

      // Check for Tailwind dark class (Flowbite's ThemeModeScript applies this)
      const hasDarkClass = html.classList.contains("dark")

      setIsDarkMode(hasDarkClass)
    }

    // Check immediately
    checkDarkMode()
    
    // Also check after a small delay to ensure Flowbite script has run
    const timeoutId = setTimeout(checkDarkMode, 100)

    // Listen for class changes on html element
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => {
      clearTimeout(timeoutId)
      observer.disconnect()
    }
  }, [])

  return isDarkMode
}

