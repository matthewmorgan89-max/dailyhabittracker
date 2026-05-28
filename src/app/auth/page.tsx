'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex flex-col px-6 py-10">

      {/* Logo */}
      <div>
        <span className="text-sm font-black uppercase tracking-widest text-white">The Work.</span>
      </div>

      {/* Main content — pushed to lower third */}
      <div className="flex-1 flex flex-col justify-end pb-16 space-y-10">

        <div className="space-y-3">
          <h1 className="text-5xl font-black uppercase leading-none tracking-tight text-white">
            Stop making<br />excuses.
          </h1>
          <p className="text-muted-foreground text-base">
            Your daily discipline OS.
          </p>
        </div>

        {sent ? (
          <div className="space-y-6">
            <div className="border border-white/10 rounded-lg p-5 space-y-1">
              <p className="font-bold text-sm">Check your email</p>
              <p className="text-muted-foreground text-sm">
                Sent a link to <span className="text-white">{email}</span>. Click it to get in.
              </p>
            </div>
            <button
              onClick={() => setSent(false)}
              className="text-xs text-muted-foreground underline underline-offset-4"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full h-14 bg-white/5 border border-white/10 rounded-lg px-4 text-white placeholder:text-white/30 text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full h-14 bg-primary hover:bg-primary/90 disabled:opacity-40 rounded-lg font-bold text-white text-base uppercase tracking-wide transition-colors"
            >
              {loading ? 'Sending...' : 'Let me in →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
