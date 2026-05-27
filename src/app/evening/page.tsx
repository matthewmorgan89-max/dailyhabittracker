'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
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

  function addItem() {
    setTomorrowItems((p) => [...p, ''])
  }

  function updateItem(i: number, val: string) {
    setTomorrowItems((p) => p.map((v, idx) => (idx === i ? val : v)))
  }

  function removeItem(i: number) {
    setTomorrowItems((p) => p.filter((_, idx) => idx !== i))
  }

  function handleSave() {
    if (frogEaten === null) return
    startTransition(async () => {
      await saveEveningReflectionAction(
        today.dateStr,
        frogEaten,
        wins,
        tomorrowItems.filter(Boolean)
      )
      setSaved(true)
      setTimeout(() => router.push('/'), 1500)
    })
  }

  if (saved) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Check className="h-6 w-6 text-primary" />
          </div>
          <p className="font-medium">Done. Good work today.</p>
          <p className="text-sm text-muted-foreground">Tomorrow&apos;s signal is set.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 pb-24">
      <div className="pt-10 pb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Evening check-in</h1>
        <p className="text-muted-foreground text-sm">{today.displayDate}</p>
      </div>

      <div className="space-y-8">

        {/* Frog question */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Did you eat the frog?</h2>
          <p className="text-xs text-muted-foreground">
            The frog = the thing you were most likely to avoid today.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setFrogEaten(true)}
              className={`flex-1 rounded-lg border py-3 text-sm font-medium transition-colors ${
                frogEaten === true
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              Yes
            </button>
            <button
              onClick={() => setFrogEaten(false)}
              className={`flex-1 rounded-lg border py-3 text-sm font-medium transition-colors ${
                frogEaten === false
                  ? 'border-destructive bg-destructive text-destructive-foreground'
                  : 'border-border hover:border-destructive/50'
              }`}
            >
              No — tomorrow it&apos;s first
            </button>
          </div>
        </section>

        {/* Wins */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">What moved today?</h2>
          <p className="text-xs text-muted-foreground">
            Name one real win — even a small one counts.
          </p>
          <Textarea
            value={wins}
            onChange={(e) => setWins(e.target.value)}
            placeholder="e.g. Sent outreach to 12 businesses, called James about investment..."
            className="text-sm resize-none"
            rows={3}
          />
        </section>

        {/* Tomorrow's Signal */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Tomorrow&apos;s Signal</h2>
          <p className="text-xs text-muted-foreground">
            Set 1–3 mission critical tasks for tomorrow morning.
            Future you will open the app and know exactly what to do.
          </p>
          <div className="space-y-2">
            {tomorrowItems.map((item, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={item}
                  onChange={(e) => updateItem(i, e.target.value)}
                  placeholder={`Signal item ${i + 1}`}
                  className="h-10 text-sm"
                />
                {tomorrowItems.length > 1 && (
                  <button
                    onClick={() => removeItem(i)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {tomorrowItems.length < 3 && (
              <button
                onClick={addItem}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-1"
              >
                <Plus className="h-4 w-4" />
                Add item
              </button>
            )}
          </div>
        </section>

        {/* Save */}
        <Button
          onClick={handleSave}
          disabled={frogEaten === null}
          className="w-full h-11"
        >
          Done for today
        </Button>
      </div>
    </div>
  )
}
