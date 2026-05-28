'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ArrowLeft, Check } from 'lucide-react'
import { saveEveningReflectionAction } from '@/app/actions'
import { getDayInfo } from '@/lib/day'

export default function EveningPage() {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const today = getDayInfo()

  const [frogEaten, setFrogEaten] = useState<boolean | null>(null)
  const [wins, setWins] = useState('')
  const [tomorrowItems, setTomorrowItems] = useState<string[]>([''])
  const [saved, setSaved] = useState(false)

  function addItem() { setTomorrowItems((p) => [...p, '']) }
  function updateItem(i: number, val: string) { setTomorrowItems((p) => p.map((v, idx) => idx === i ? val : v)) }
  function removeItem(i: number) { setTomorrowItems((p) => p.filter((_, idx) => idx !== i)) }

  function handleSave() {
    if (frogEaten === null) return
    startTransition(async () => {
      await saveEveningReflectionAction(today.dateStr, frogEaten, wins, tomorrowItems.filter(Boolean))
      setSaved(true)
      setTimeout(() => router.push('/'), 1500)
    })
  }

  if (saved) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center mx-auto">
            <Check className="h-7 w-7 text-white" strokeWidth={3} />
          </div>
          <p className="font-black uppercase tracking-tight text-xl">Done.</p>
          <p className="text-sm text-white/40">Good work today.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black max-w-lg mx-auto px-5 pb-24">

      {/* Header */}
      <div className="pt-10 pb-8 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-white/30 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Evening.</h1>
          <p className="text-white/40 text-sm">{today.displayDate}</p>
        </div>
      </div>

      <div className="space-y-10">

        {/* Frog */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-white/40 mb-1">The frog</h2>
            <p className="text-lg font-black uppercase tracking-tight leading-tight">Did you eat it?</p>
            <p className="text-xs text-white/30 mt-1">The thing you were most likely to avoid today.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setFrogEaten(true)}
              className={`rounded-xl border py-4 text-sm font-black uppercase tracking-wide transition-all ${
                frogEaten === true
                  ? 'border-primary bg-primary text-white'
                  : 'border-white/10 text-white/60 hover:border-white/30'
              }`}
            >
              Yes
            </button>
            <button
              onClick={() => setFrogEaten(false)}
              className={`rounded-xl border py-4 text-sm font-black uppercase tracking-wide transition-all ${
                frogEaten === false
                  ? 'border-white bg-white text-black'
                  : 'border-white/10 text-white/60 hover:border-white/30'
              }`}
            >
              No — first up tomorrow
            </button>
          </div>
        </section>

        {/* Wins */}
        <section className="space-y-3">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-white/40 mb-1">Wins</h2>
            <p className="text-lg font-black uppercase tracking-tight leading-tight">What moved today?</p>
            <p className="text-xs text-white/30 mt-1">Name one real thing. Even small counts.</p>
          </div>
          <textarea
            value={wins}
            onChange={(e) => setWins(e.target.value)}
            placeholder="e.g. Sent 12 outreach emails, had a good call with James..."
            className="w-full bg-white/4 border border-white/8 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-primary transition-colors"
            rows={3}
          />
        </section>

        {/* Tomorrow's Signal */}
        <section className="space-y-3">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-white/40 mb-1">Tomorrow</h2>
            <p className="text-lg font-black uppercase tracking-tight leading-tight">Set your Signal.</p>
            <p className="text-xs text-white/30 mt-1">1–3 mission critical items. Future you opens the app and knows exactly what to do.</p>
          </div>
          <div className="space-y-2">
            {tomorrowItems.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={item}
                  onChange={(e) => updateItem(i, e.target.value)}
                  placeholder={`Signal ${i + 1}`}
                  className="flex-1 h-11 bg-white/4 border border-white/8 rounded-lg px-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary transition-colors"
                />
                {tomorrowItems.length > 1 && (
                  <button onClick={() => removeItem(i)} className="text-white/20 hover:text-white/50 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {tomorrowItems.length < 3 && (
              <button
                onClick={addItem}
                className="flex items-center gap-2 text-sm text-white/30 hover:text-white/60 transition-colors px-1"
              >
                <Plus className="h-4 w-4" />
                Add item
              </button>
            )}
          </div>
        </section>

        <button
          onClick={handleSave}
          disabled={frogEaten === null}
          className="w-full h-14 bg-primary disabled:opacity-30 rounded-xl font-black uppercase tracking-wide text-white text-sm transition-opacity"
        >
          Done for today →
        </button>
      </div>
    </div>
  )
}
