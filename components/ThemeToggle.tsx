'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return <div className="w-[76px] h-[38px]" />

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Przełącz na tryb jasny' : 'Przełącz na tryb ciemny'}
      className={[
        'relative w-[76px] h-[38px] rounded-full transition-colors duration-300 focus-visible:outline-none',
        isDark ? 'bg-[#1E1640]' : 'bg-[#E8EAF0]',
        className ?? '',
      ].join(' ')}
    >
      {/* Sliding knob — left center: x=19, right center: x=57 */}
      <div className={[
        'absolute top-[3px] w-[32px] h-[32px] rounded-full transition-transform duration-300 ease-in-out',
        isDark ? 'translate-x-[41px] bg-[#3A3060]' : 'translate-x-[3px] bg-white shadow-sm',
      ].join(' ')} />

      {/* Sun — absolute, center exactly at x=19 (left knob center) */}
      <div className={[
        'absolute inset-y-0 left-0 w-[38px] flex items-center justify-center transition-colors duration-300',
        isDark ? 'text-white/30' : 'text-gray-500',
      ].join(' ')}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="2"  x2="12" y2="5"  />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="2"  y1="12" x2="5"  y2="12" />
          <line x1="19" y1="12" x2="22" y2="12" />
          <line x1="4.93"  y1="4.93"  x2="7.05"  y2="7.05"  />
          <line x1="16.95" y1="16.95" x2="19.07" y2="19.07" />
          <line x1="4.93"  y1="19.07" x2="7.05"  y2="16.95" />
          <line x1="16.95" y1="7.05"  x2="19.07" y2="4.93"  />
        </svg>
      </div>

      {/* Moon — absolute, center exactly at x=57 (right knob center) */}
      <div className={[
        'absolute inset-y-0 right-0 w-[38px] flex items-center justify-center transition-colors duration-300',
        isDark ? 'text-white' : 'text-gray-300',
      ].join(' ')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </div>
    </button>
  )
}
