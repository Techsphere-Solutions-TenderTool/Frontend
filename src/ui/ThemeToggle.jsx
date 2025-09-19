import { useEffect, useState } from 'react'

const THEME_KEY = 'theme'
const LIGHT = 'light'
const DARK = 'business' // daisyUI dark-ish theme; change if you like

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY)
      if (saved) return saved
    } catch {}
    const prefersDark = typeof window !== 'undefined'
      && window.matchMedia
      && window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? DARK : LIGHT
  })

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
    }
    try { localStorage.setItem(THEME_KEY, theme) } catch {}
  }, [theme])

  const isDark = theme === DARK

  return (
    <label className="flex cursor-pointer gap-2 items-center">
      <span className="text-sm">Theme</span>
      <input
        type="checkbox"
        className="toggle"         
        checked={isDark}
        onChange={(e) => setTheme(e.target.checked ? DARK : LIGHT)}
      />
    </label>
  )
}