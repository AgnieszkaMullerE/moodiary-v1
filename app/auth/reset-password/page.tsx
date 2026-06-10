'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Hasła nie są identyczne')
      return
    }
    if (password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      router.push('/')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Coś poszło nie tak')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative h-full flex flex-col items-center justify-center px-8 gap-8 overflow-hidden">

      {/* ── Gradient blobs — lekko inne pozycje niż na logowaniu ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Top-center: deep indigo */}
        <div
          className="absolute -top-16 left-1/4 w-72 h-72 rounded-full"
          style={{ background: 'radial-gradient(circle, #4338CA 0%, transparent 70%)', opacity: 0.3, filter: 'blur(45px)' }}
        />
        {/* Top-left: violet */}
        <div
          className="absolute -top-6 -left-8 w-56 h-56 rounded-full"
          style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)', opacity: 0.28, filter: 'blur(50px)' }}
        />
        {/* Center-right: navy blue */}
        <div
          className="absolute top-1/3 right-0 w-64 h-64 rounded-full"
          style={{ background: 'radial-gradient(circle, #1E3A8A 0%, transparent 70%)', opacity: 0.38, filter: 'blur(60px)' }}
        />
        {/* Center-left: purple */}
        <div
          className="absolute top-1/2 -left-8 w-48 h-48 rounded-full"
          style={{ background: 'radial-gradient(circle, #9333EA 0%, transparent 70%)', opacity: 0.22, filter: 'blur(45px)' }}
        />
        {/* Bottom-right: dark pink/rose */}
        <div
          className="absolute -bottom-10 right-12 w-72 h-72 rounded-full"
          style={{ background: 'radial-gradient(circle, #BE185D 0%, transparent 70%)', opacity: 0.28, filter: 'blur(55px)' }}
        />
        {/* Bottom-left: blue */}
        <div
          className="absolute bottom-16 -left-6 w-56 h-56 rounded-full"
          style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)', opacity: 0.22, filter: 'blur(50px)' }}
        />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 text-center flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight font-[family-name:var(--font-display)]">
          Ustaw nowe hasło
        </h1>
        <p className="text-sm text-gray-500">Wpisz nowe hasło do swojego konta</p>
      </div>

      <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-xs flex flex-col gap-6">
        {/* Nowe hasło — underline style */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-semibold tracking-[0.18em] uppercase text-gray-400">
            Nowe hasło
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full bg-transparent border-0 border-b border-gray-300 pb-2 text-sm text-gray-900 placeholder-transparent focus:outline-none focus:border-gray-500 transition-colors"
          />
        </div>

        {/* Powtórz hasło — underline style */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-semibold tracking-[0.18em] uppercase text-gray-400">
            Powtórz hasło
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            className="w-full bg-transparent border-0 border-b border-gray-300 pb-2 text-sm text-gray-900 placeholder-transparent focus:outline-none focus:border-gray-500 transition-colors"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 -mt-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-14 rounded-full bg-[#1C1C1E] text-white text-sm font-medium tracking-wide hover:bg-[#1C1C1E]/90 transition-colors disabled:opacity-50 mt-2"
        >
          {loading ? '...' : 'Zapisz nowe hasło'}
        </button>
      </form>
    </div>
  )
}
