'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('Wrong email or password.')
      } else {
        router.push('/')
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        // Auto sign in after signup
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) {
          setError('Account created — check your email to confirm, then log in.')
        } else {
          router.push('/')
          router.refresh()
        }
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex flex-col px-6 py-10">

      {/* Logo */}
      <div>
        <span className="text-sm font-black uppercase tracking-widest text-white">The Work.</span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-end pb-16 space-y-10">

        <div className="space-y-3">
          <h1 className="text-5xl font-black uppercase leading-none tracking-tight text-white">
            Stop making<br />excuses.
          </h1>
          <p className="text-white/40 text-base">Your daily discipline OS.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            className="w-full h-14 bg-white/5 border border-white/10 rounded-lg px-4 text-white placeholder:text-white/30 text-base focus:outline-none focus:border-primary transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full h-14 bg-white/5 border border-white/10 rounded-lg px-4 text-white placeholder:text-white/30 text-base focus:outline-none focus:border-primary transition-colors"
          />

          {error && (
            <p className="text-sm text-red-400 px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full h-14 bg-primary hover:bg-primary/90 disabled:opacity-30 rounded-lg font-black text-white text-base uppercase tracking-wide transition-colors"
          >
            {loading
              ? '...'
              : mode === 'login'
              ? 'Sign in →'
              : 'Create account →'}
          </button>
        </form>

        {/* Toggle between login and signup */}
        <div className="text-center">
          {mode === 'login' ? (
            <button
              onClick={() => { setMode('signup'); setError('') }}
              className="text-sm text-white/30 hover:text-white/60 transition-colors"
            >
              First time? Create an account
            </button>
          ) : (
            <button
              onClick={() => { setMode('login'); setError('') }}
              className="text-sm text-white/30 hover:text-white/60 transition-colors"
            >
              Already have an account? Sign in
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
