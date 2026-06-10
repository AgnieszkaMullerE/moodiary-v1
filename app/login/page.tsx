'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ThemeToggle'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)

    const supabase = createClient()

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/')
        router.refresh()
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        // Jeśli identities puste — email już istnieje
        if (data.user && data.user.identities?.length === 0) {
          setError('Ten email jest już zarejestrowany. Zaloguj się lub zresetuj hasło.')
        } else {
          router.push('/')
          router.refresh()
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Coś poszło nie tak'
      if (msg.includes('Invalid login credentials')) {
        setError('Nieprawidłowy email lub hasło')
      } else if (msg.includes('Password should be at least')) {
        setError('Hasło musi mieć co najmniej 6 znaków')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    setError(null)
    setInfo(null)
    if (!email) {
      setError('Wpisz najpierw adres email powyżej')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      })
      if (error) throw error
      setInfo(`✓ Link do resetowania hasła wysłany na ${email}. Sprawdź skrzynkę (i folder spam).`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Nie udało się wysłać emaila')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative h-full flex flex-col items-center justify-center px-8 gap-8 overflow-hidden">

      {/* ── Theme toggle ── */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* ── Gradient blobs (animowane) ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="blob-la absolute -top-24 -left-24 w-72 h-72 rounded-full"
          style={{ background: 'radial-gradient(circle, #4338CA 0%, transparent 70%)' }} />
        <div className="blob-lb absolute -top-10 right-0 w-56 h-56 rounded-full"
          style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)' }} />
        <div className="blob-lc absolute top-1/3 -left-16 w-64 h-64 rounded-full"
          style={{ background: 'radial-gradient(circle, #1E3A8A 0%, transparent 70%)' }} />
        <div className="blob-ld absolute top-1/2 right-4 w-48 h-48 rounded-full"
          style={{ background: 'radial-gradient(circle, #9333EA 0%, transparent 70%)' }} />
        <div className="blob-lb-r absolute -bottom-16 left-8 w-72 h-72 rounded-full"
          style={{ background: 'radial-gradient(circle, #BE185D 0%, transparent 70%)' }} />
        <div className="blob-la-r absolute bottom-10 -right-10 w-56 h-56 rounded-full"
          style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)' }} />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 text-center flex flex-col gap-2">
        <h1 className="text-6xl font-bold text-foreground tracking-tight font-[family-name:var(--font-display)]">
          Moodiary
        </h1>
        <p className="text-sm text-muted-foreground">Prywatny dziennik osobisty</p>
      </div>

      <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-xs flex flex-col gap-6">
        {/* Email — underline style */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-transparent border-0 border-b border-border pb-2 text-sm text-foreground placeholder-transparent focus:outline-none focus:border-foreground/50 transition-colors [&:-webkit-autofill]:shadow-[0_0_0_1000px_transparent_inset] [&:-webkit-autofill]:[transition:background-color_9999s]"
          />
        </div>

        {/* Password — underline style */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
            {mode === 'login' ? 'Password' : 'Hasło'}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-transparent border-0 border-b border-border pb-2 pr-8 text-sm text-foreground placeholder-transparent focus:outline-none focus:border-foreground/50 transition-colors [&:-webkit-autofill]:shadow-[0_0_0_1000px_transparent_inset] [&:-webkit-autofill]:[transition:background-color_9999s]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-0 bottom-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 -mt-2">{error}</p>
        )}
        {info && (
          <p className="text-sm text-green-600 -mt-2">{info}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-14 rounded-full bg-foreground text-background text-sm font-medium tracking-wide hover:bg-foreground/90 transition-colors disabled:opacity-50 mt-2"
        >
          {loading ? '...' : mode === 'login' ? 'sign in' : 'sign up'}
        </button>

        {mode === 'login' && (
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-xs text-muted-foreground hover:text-foreground/70 text-center transition-colors"
          >
            Zapomniałam hasła
          </button>
        )}
      </form>

      <button
        type="button"
        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
        className="relative z-10 text-sm text-muted-foreground hover:text-foreground/70 transition-colors"
      >
        {mode === 'login' ? 'Nie masz konta? Zarejestruj się' : 'Masz już konto? Zaloguj się'}
      </button>
    </div>
  )
}
