'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Check, Plus, Trash2, ChevronRight, Zap, BarChart2, Bell } from 'lucide-react'
import {
  toggleHabitAction,
  addSignalItemAction,
  toggleSignalItemAction,
  deleteSignalItemAction,
  updateVouchOutreachAction,
  subscribePushAction,
  saveIntentionAction,
  saveWeeklyNonNegotiablesAction,
} from '@/app/actions'
import type { DayInfo } from '@/lib/day'
import { FROG_QUOTE } from '@/lib/day'
import type { HabitDefinition, HabitCategory } from '@/lib/habits'
import { CATEGORY_LABELS, CATEGORY_ORDER, NON_NEG_ELIGIBLE } from '@/lib/habits'
import type { CoachingInsight } from '@/lib/coaching'

interface SignalItem {
  id: string
  title: string
  completed: boolean
}

interface VouchOutreach {
  mass_count: number
  personalised_name: string | null
}

interface Props {
  today: DayInfo
  principle: { text: string; source: string }
  habits: HabitDefinition[]
  completedKeys: string[]
  signalItems: SignalItem[]
  outreach: VouchOutreach | null
  lastNightSignal: string[]
  todayIntention: string | null
  coachingInsight: CoachingInsight | null
  weekNonNegotiables: string[]
  weekStart: string
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export function HomeClient({
  today, principle, habits, completedKeys, signalItems, outreach,
  lastNightSignal, todayIntention, coachingInsight, weekNonNegotiables, weekStart,
}: Props) {
  const [, startTransition] = useTransition()

  const [optimisticCompleted, setOptimisticCompleted] = useState<Set<string>>(new Set(completedKeys))
  const [localSignal, setLocalSignal] = useState<SignalItem[]>(signalItems)
  const [massCount, setMassCount] = useState(outreach?.mass_count?.toString() ?? '')
  const [personalisedName, setPersonalisedName] = useState(outreach?.personalised_name ?? '')
  const [signalInput, setSignalInput] = useState('')
  const [showSignalInput, setShowSignalInput] = useState(false)
  const signalInputRef = useRef<HTMLInputElement>(null)

  // ── Morning intention contract ─────────────────────────────────────────────
  const [intention, setIntention] = useState<string | null>(todayIntention)
  const [intentionInput, setIntentionInput] = useState('')
  const [intentionLoading, setIntentionLoading] = useState(false)
  const isBeforeNoon = new Date().getHours() < 12

  async function handleIntentionSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!intentionInput.trim()) return
    setIntentionLoading(true)
    await saveIntentionAction(today.dateStr, intentionInput.trim())
    setIntention(intentionInput.trim())
    setIntentionLoading(false)
  }

  // ── Weekly non-negotiables ────────────────────────────────────────────────
  const [weekNonNeg, setWeekNonNeg] = useState<string[]>(weekNonNegotiables)
  const [selectedNonNeg, setSelectedNonNeg] = useState<string[]>(
    weekNonNegotiables.length > 0
      ? weekNonNegotiables
      : ['mass_outreach', 'exercise', 'lights_out_10pm']
  )
  const [nonNegLoading, setNonNegLoading] = useState(false)
  const showNonNegGate = weekNonNeg.length === 0 && today.type !== 'rest'
  const showIntentionGate = !intention && isBeforeNoon && today.type !== 'rest' && !showNonNegGate

  function toggleNonNeg(key: string) {
    setSelectedNonNeg((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key)
      if (prev.length >= 3) return prev
      return [...prev, key]
    })
  }

  async function handleNonNegSubmit() {
    if (selectedNonNeg.length !== 3) return
    setNonNegLoading(true)
    await saveWeeklyNonNegotiablesAction(weekStart, selectedNonNeg)
    setWeekNonNeg(selectedNonNeg)
    setNonNegLoading(false)
  }

  // ── Last night's frog ─────────────────────────────────────────────────────
  const existingTitles = new Set(localSignal.map((s) => s.title.toLowerCase()))
  const [dismissedFrogs, setDismissedFrogs] = useState<Set<string>>(new Set())
  const pendingFrogs = lastNightSignal.filter(
    (t) => !existingTitles.has(t.toLowerCase()) && !dismissedFrogs.has(t)
  )

  function addFrogToSignal(title: string) {
    const temp: SignalItem = { id: `temp-${Date.now()}`, title, completed: false }
    setLocalSignal((prev) => [...prev, temp])
    setDismissedFrogs((prev) => new Set([...prev, title]))
    startTransition(() => { addSignalItemAction(title, today.dateStr) })
  }

  function addAllFrogs() { pendingFrogs.forEach((t) => addFrogToSignal(t)) }

  // ── Push notifications ────────────────────────────────────────────────────
  const isAfter5pm = new Date().getHours() >= 17
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null)
  const [pushLoading, setPushLoading] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setPushEnabled(!!sub))
        .catch(() => setPushEnabled(false))
    } else {
      setPushEnabled(false)
    }
  }, [])

  async function enablePush() {
    setPushLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      await subscribePushAction(JSON.parse(JSON.stringify(sub)))
      setPushEnabled(true)
    } catch (e) { console.error('Push subscribe failed:', e) }
    setPushLoading(false)
  }

  useEffect(() => { if (showSignalInput) signalInputRef.current?.focus() }, [showSignalInput])
  useEffect(() => {
    setOptimisticCompleted(new Set(completedKeys))
    setLocalSignal(signalItems)
  }, [completedKeys, signalItems])

  // ── Progress ──────────────────────────────────────────────────────────────
  const totalHabits = habits.length
  const doneCount = habits.filter((h) => optimisticCompleted.has(h.key)).length
  const signalDone = localSignal.filter((s) => s.completed).length
  const nonNegDone = weekNonNeg.filter((k) => optimisticCompleted.has(k)).length
  const hasNonNegs = weekNonNeg.length > 0
  const progressPct = hasNonNegs
    ? Math.round((nonNegDone / 3) * 100)
    : totalHabits > 0 ? Math.round((doneCount / totalHabits) * 100) : 0
  const progressLabel = hasNonNegs
    ? `${nonNegDone}/3 non-negotiables`
    : `${doneCount}/${totalHabits}`

  // ── Habit grouping ────────────────────────────────────────────────────────
  const nonNegSet = new Set(weekNonNeg)
  const nonNegHabits = weekNonNeg
    .map((k) => habits.find((h) => h.key === k))
    .filter((h): h is HabitDefinition => !!h)
  const bonusHabits = habits.filter((h) => !nonNegSet.has(h.key))
  const byCategory = CATEGORY_ORDER.reduce<Record<HabitCategory, HabitDefinition[]>>(
    (acc, cat) => { acc[cat] = bonusHabits.filter((h) => h.category === cat); return acc },
    { morning: [], vouch: [], body: [], mind: [], relationships: [] }
  )

  function toggleHabit(key: string) {
    const next = new Set(optimisticCompleted)
    if (next.has(key)) next.delete(key); else next.add(key)
    setOptimisticCompleted(next)
    startTransition(() => { toggleHabitAction(key, today.dateStr) })
  }

  function addSignalItem() {
    if (!signalInput.trim()) return
    const temp: SignalItem = { id: `temp-${Date.now()}`, title: signalInput.trim(), completed: false }
    setLocalSignal((prev) => [...prev, temp])
    setSignalInput('')
    setShowSignalInput(false)
    startTransition(() => { addSignalItemAction(temp.title, today.dateStr) })
  }

  function toggleSignal(id: string, current: boolean) {
    setLocalSignal((prev) => prev.map((s) => s.id === id ? { ...s, completed: !current } : s))
    startTransition(() => { toggleSignalItemAction(id, !current) })
  }

  function deleteSignal(id: string) {
    setLocalSignal((prev) => prev.filter((s) => s.id !== id))
    startTransition(() => { deleteSignalItemAction(id) })
  }

  function handleMassCountBlur() {
    const val = parseInt(massCount) || 0
    if (val > 0 && val !== (outreach?.mass_count ?? 0)) {
      if (!optimisticCompleted.has('mass_outreach')) {
        setOptimisticCompleted((prev) => new Set([...prev, 'mass_outreach']))
        startTransition(() => { toggleHabitAction('mass_outreach', today.dateStr) })
      }
      startTransition(() => { updateVouchOutreachAction(today.dateStr, val, undefined) })
    }
  }

  function handlePersonalisedNameBlur() {
    if (personalisedName !== (outreach?.personalised_name ?? '')) {
      if (personalisedName.trim() && !optimisticCompleted.has('personalised_outreach')) {
        setOptimisticCompleted((prev) => new Set([...prev, 'personalised_outreach']))
        startTransition(() => { toggleHabitAction('personalised_outreach', today.dateStr) })
      }
      startTransition(() => { updateVouchOutreachAction(today.dateStr, undefined, personalisedName.trim()) })
    }
  }

  const dayBadgeColor = today.type === 'office'
    ? 'bg-white text-black'
    : today.type === 'rest' ? 'bg-white/10 text-white/60' : 'bg-white/10 text-white/80'

  // ── Gate: Weekly non-negotiables ──────────────────────────────────────────
  if (showNonNegGate) {
    return (
      <div className="min-h-screen bg-black flex flex-col px-6 py-10">
        <div><span className="text-sm font-black uppercase tracking-widest text-white">The Work.</span></div>
        <div className="flex-1 flex flex-col justify-end pb-16 space-y-8">
          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-widest text-primary">This week&apos;s absolutes</p>
            <h1 className="text-4xl font-black uppercase leading-tight tracking-tight text-white">
              Pick your 3 non-negotiables.
            </h1>
            <p className="text-white/30 text-sm">
              Win the week by hitting all 3. Everything else is bonus.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {NON_NEG_ELIGIBLE.map((habit) => {
              const isSelected = selectedNonNeg.includes(habit.key)
              const isDisabled = !isSelected && selectedNonNeg.length >= 3
              return (
                <button
                  key={habit.key}
                  onClick={() => toggleNonNeg(habit.key)}
                  disabled={isDisabled}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold border transition-all ${
                    isSelected
                      ? 'bg-primary border-primary text-white'
                      : isDisabled
                      ? 'border-white/5 text-white/20 bg-white/2'
                      : 'border-white/15 text-white/60 hover:border-white/40 hover:text-white'
                  }`}
                >
                  {habit.label}
                </button>
              )
            })}
          </div>

          <div className="space-y-3">
            <p className="text-xs text-white/30 text-center">
              {selectedNonNeg.length}/3 selected
            </p>
            <button
              onClick={handleNonNegSubmit}
              disabled={selectedNonNeg.length !== 3 || nonNegLoading}
              className="w-full h-14 bg-primary hover:bg-primary/90 disabled:opacity-30 rounded-lg font-black text-white text-base uppercase tracking-wide transition-colors"
            >
              {nonNegLoading ? '...' : 'Set for this week →'}
            </button>
            <button
              onClick={() => setWeekNonNeg([])}
              className="w-full text-center text-xs text-white/20 hover:text-white/40 transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Gate: Daily intention ─────────────────────────────────────────────────
  if (showIntentionGate) {
    return (
      <div className="min-h-screen bg-black flex flex-col px-6 py-10">
        <div><span className="text-sm font-black uppercase tracking-widest text-white">The Work.</span></div>
        <div className="flex-1 flex flex-col justify-end pb-16 space-y-8">
          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-widest text-primary">Morning contract</p>
            <h1 className="text-4xl font-black uppercase leading-tight tracking-tight text-white">
              What&apos;s the one thing that makes today a win?
            </h1>
            <p className="text-white/30 text-sm">If you do nothing else, do this.</p>
          </div>

          <form onSubmit={handleIntentionSubmit} className="space-y-3">
            <textarea
              value={intentionInput}
              onChange={(e) => setIntentionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleIntentionSubmit(e as unknown as React.FormEvent) }
              }}
              placeholder="e.g. Send 20 personalised Vouch outreaches"
              autoFocus
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3.5 text-white placeholder:text-white/25 text-base focus:outline-none focus:border-primary transition-colors resize-none"
            />
            <button
              type="submit"
              disabled={!intentionInput.trim() || intentionLoading}
              className="w-full h-14 bg-primary hover:bg-primary/90 disabled:opacity-30 rounded-lg font-black text-white text-base uppercase tracking-wide transition-colors"
            >
              {intentionLoading ? '...' : 'Commit →'}
            </button>
          </form>

          <button
            onClick={() => setIntention('')}
            className="text-center text-xs text-white/20 hover:text-white/40 transition-colors"
          >
            Skip today
          </button>
        </div>
      </div>
    )
  }

  // ── Main screen ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black max-w-lg mx-auto px-5 pb-32">

      {/* Header */}
      <div className="pt-10 pb-8 space-y-5">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <h1 className="text-3xl font-black uppercase tracking-tight text-white">The Work.</h1>
            <p className="text-white/40 text-sm font-medium">{today.displayDate}</p>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${dayBadgeColor}`}>
              {today.label}
            </span>
            <Link href="/weekly" className="text-white/30 hover:text-white transition-colors">
              <BarChart2 className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-bold uppercase tracking-wider text-white/40">Today</span>
            <span className="text-xs font-bold text-white/40">{progressLabel}</span>
          </div>
          <div className="h-1 bg-white/8 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Frog quote — always pinned */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
          <p className="text-sm text-white/80 leading-relaxed italic">&ldquo;{FROG_QUOTE.text}&rdquo;</p>
          <p className="text-xs text-primary/70 mt-1 font-semibold">— {FROG_QUOTE.source}</p>
        </div>

        {/* Rotating principle */}
        <div className="border-l-2 border-white/10 pl-4 py-0.5">
          <p className="text-sm text-white/40 leading-relaxed italic">&ldquo;{principle.text}&rdquo;</p>
          <p className="text-xs text-white/20 mt-1">— {principle.source}</p>
        </div>

        {/* Today's commitment */}
        {intention && (
          <div className="bg-primary rounded-lg px-4 py-3 space-y-0.5">
            <p className="text-xs font-black uppercase tracking-widest text-white/60">Today&apos;s commitment</p>
            <p className="text-sm font-bold text-white leading-snug">&ldquo;{intention}&rdquo;</p>
          </div>
        )}

        {/* Push prompt */}
        {pushEnabled === false && (
          <button
            onClick={enablePush}
            disabled={pushLoading}
            className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            <Bell className="h-3.5 w-3.5" />
            {pushLoading ? 'Enabling...' : 'Enable daily reminders'}
          </button>
        )}
      </div>

      {/* Pattern coaching */}
      {coachingInsight && (
        <section className="mb-6">
          <div className="border border-white/10 bg-white/3 rounded-xl p-4 space-y-1.5">
            <p className="text-xs font-black uppercase tracking-widest text-white/30">Pattern spotted</p>
            <p className="text-sm text-white/70 leading-relaxed">{coachingInsight.message}</p>
          </div>
        </section>
      )}

      {/* Last night's frog */}
      {pendingFrogs.length > 0 && (
        <section className="mb-6">
          <div className="border border-primary/30 bg-primary/8 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🐸</span>
                <span className="text-xs font-black uppercase tracking-widest text-primary">Last night you committed to</span>
              </div>
              {pendingFrogs.length > 1 && (
                <button onClick={addAllFrogs} className="text-xs font-bold text-primary/70 hover:text-primary transition-colors">
                  Add all →
                </button>
              )}
            </div>
            <div className="space-y-2">
              {pendingFrogs.map((title) => (
                <div key={title} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-white/80 flex-1">{title}</span>
                  <button
                    onClick={() => addFrogToSignal(title)}
                    className="flex-shrink-0 text-xs font-bold text-primary border border-primary/40 rounded px-2.5 py-1 hover:bg-primary/20 transition-colors"
                  >
                    + Signal
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-white/30">Eat the frog first. Everything else can wait.</p>
          </div>
        </section>
      )}

      {/* Signal */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-primary" fill="currentColor" />
          <h2 className="text-xs font-black uppercase tracking-widest text-primary">Signal</h2>
          <span className="text-xs text-white/20 ml-auto">Mission critical</span>
          {localSignal.length > 0 && (
            <span className="text-xs font-bold text-white/30">{signalDone}/{localSignal.length}</span>
          )}
        </div>
        <div className="space-y-2">
          {localSignal.length === 0 && !showSignalInput && (
            <p className="text-sm text-white/30 px-1">What&apos;s mission critical today?</p>
          )}
          {localSignal.map((item) => (
            <div key={item.id} className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-lg px-4 py-3.5 group">
              <button
                onClick={() => toggleSignal(item.id, item.completed)}
                className={`flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                  item.completed ? 'bg-primary border-primary' : 'border-primary/60 hover:border-primary'
                }`}
              >
                {item.completed && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </button>
              <span className={`flex-1 text-sm font-medium ${item.completed ? 'line-through text-white/30' : 'text-white'}`}>
                {item.title}
              </span>
              <button onClick={() => deleteSignal(item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-white/60">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {showSignalInput ? (
            <div className="flex gap-2">
              <input
                ref={signalInputRef}
                value={signalInput}
                onChange={(e) => setSignalInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addSignalItem(); if (e.key === 'Escape') setShowSignalInput(false) }}
                placeholder="What's mission critical today?"
                className="flex-1 h-11 bg-white/5 border border-white/10 rounded-lg px-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary transition-colors"
              />
              <button onClick={addSignalItem} disabled={!signalInput.trim()} className="h-11 px-4 bg-primary disabled:opacity-30 rounded-lg text-sm font-bold text-white">
                Add
              </button>
            </div>
          ) : (
            <button onClick={() => setShowSignalInput(true)} className="flex items-center gap-2 text-sm text-white/30 hover:text-primary transition-colors px-1 py-1.5">
              <Plus className="h-4 w-4" />
              Add signal item
            </button>
          )}
        </div>
      </section>

      {/* Habits */}
      {today.type === 'rest' ? (

        // ── Sunday screen ──────────────────────────────────────────────────
        <div className="space-y-6">
          <div>
            <p className="font-black uppercase tracking-tight text-2xl">Sunday. Rest.</p>
            <p className="text-white/40 text-sm mt-1">Recovery is part of the system.</p>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-white/25">Before tomorrow</p>
            <Link href="/weekly" className="flex items-center justify-between bg-white/4 border border-white/8 rounded-xl px-4 py-4 hover:border-white/20 transition-colors">
              <div>
                <p className="text-sm font-bold text-white">Weekly review</p>
                <p className="text-xs text-white/40 mt-0.5">How did the week go? What patterns showed up?</p>
              </div>
              <ChevronRight className="h-4 w-4 text-white/30" />
            </Link>
            <Link href="/evening" className="flex items-center justify-between bg-white/4 border border-white/8 rounded-xl px-4 py-4 hover:border-white/20 transition-colors">
              <div>
                <p className="text-sm font-bold text-white">Set Monday&apos;s frog</p>
                <p className="text-xs text-white/40 mt-0.5">Future you opens the app and knows exactly what to do.</p>
              </div>
              <ChevronRight className="h-4 w-4 text-white/30" />
            </Link>
          </div>
          <p className="text-xs text-white/20 text-center">Non-negotiables for next week are set Monday morning.</p>
        </div>

      ) : (

        // ── Weekday habit list ────────────────────────────────────────────
        <div className="space-y-7">

          {/* Non-negotiables section */}
          {hasNonNegs && nonNegHabits.length > 0 && (
            <section>
              <h2 className="text-xs font-black uppercase tracking-widest text-primary mb-3">
                Non-negotiables
              </h2>
              <div className="space-y-2">
                {nonNegHabits.map((habit) => {
                  const done = optimisticCompleted.has(habit.key)
                  return (
                    <HabitCard key={habit.key} habit={habit} done={done} onToggle={toggleHabit} highlight>
                      {habit.key === 'mass_outreach' && (done || massCount) && (
                        <div className="flex items-center gap-3 mt-3 ml-8">
                          <input type="number" min="0" value={massCount} onChange={(e) => setMassCount(e.target.value)} onBlur={handleMassCountBlur} placeholder="0"
                            className="h-8 w-20 bg-white/5 border border-white/10 rounded px-3 text-xs text-white focus:outline-none focus:border-primary" />
                          <span className="text-xs text-white/30">outreaches today</span>
                        </div>
                      )}
                      {habit.key === 'personalised_outreach' && (done || personalisedName) && (
                        <div className="mt-3 ml-8">
                          <input value={personalisedName} onChange={(e) => setPersonalisedName(e.target.value)} onBlur={handlePersonalisedNameBlur} placeholder="Who did you reach out to?"
                            className="w-full h-8 bg-white/5 border border-white/10 rounded px-3 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-primary" />
                        </div>
                      )}
                      {habit.key === 'exercise' && today.showLunchExercise && !done && (
                        <p className="text-xs text-primary ml-8 mt-1.5 font-medium">Lunch today — office day</p>
                      )}
                    </HabitCard>
                  )
                })}
              </div>
            </section>
          )}

          {/* Bonus habits by category */}
          {(hasNonNegs ? bonusHabits.length > 0 : true) && (
            <>
              {hasNonNegs && bonusHabits.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/8" />
                  <span className="text-xs font-black uppercase tracking-widest text-white/20">Bonus habits</span>
                  <div className="flex-1 h-px bg-white/8" />
                </div>
              )}

              {CATEGORY_ORDER.map((cat) => {
                const catHabits = hasNonNegs ? byCategory[cat] : habits.filter((h) => h.category === cat)
                if (!catHabits.length) return null

                return (
                  <section key={cat}>
                    <h2 className="text-xs font-black uppercase tracking-widest text-white/25 mb-3">
                      {CATEGORY_LABELS[cat]}
                    </h2>
                    <div className="space-y-2">
                      {catHabits.map((habit) => {
                        const done = optimisticCompleted.has(habit.key)

                        if (habit.key === 'mass_outreach') {
                          return (
                            <HabitCard key={habit.key} habit={habit} done={done} onToggle={toggleHabit}>
                              {(done || massCount) && (
                                <div className="flex items-center gap-3 mt-3 ml-8">
                                  <input type="number" min="0" value={massCount} onChange={(e) => setMassCount(e.target.value)} onBlur={handleMassCountBlur} placeholder="0"
                                    className="h-8 w-20 bg-white/5 border border-white/10 rounded px-3 text-xs text-white focus:outline-none focus:border-primary" />
                                  <span className="text-xs text-white/30">outreaches today</span>
                                </div>
                              )}
                            </HabitCard>
                          )
                        }

                        if (habit.key === 'personalised_outreach') {
                          return (
                            <HabitCard key={habit.key} habit={habit} done={done} onToggle={toggleHabit}>
                              {(done || personalisedName) && (
                                <div className="mt-3 ml-8">
                                  <input value={personalisedName} onChange={(e) => setPersonalisedName(e.target.value)} onBlur={handlePersonalisedNameBlur} placeholder="Who did you reach out to?"
                                    className="w-full h-8 bg-white/5 border border-white/10 rounded px-3 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-primary" />
                                </div>
                              )}
                            </HabitCard>
                          )
                        }

                        return (
                          <HabitCard key={habit.key} habit={habit} done={done} onToggle={toggleHabit}>
                            {habit.key === 'exercise' && today.showLunchExercise && !done && (
                              <p className="text-xs text-primary ml-8 mt-1.5 font-medium">Lunch today — office day</p>
                            )}
                          </HabitCard>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* Evening CTA */}
      {isAfter5pm && (
        <div className="fixed bottom-6 left-0 right-0 px-5 max-w-lg mx-auto">
          <Link href="/evening">
            <div className="bg-primary rounded-xl px-5 py-4 flex items-center justify-between shadow-2xl">
              <div>
                <p className="font-black uppercase tracking-tight text-white text-sm">Evening check-in</p>
                <p className="text-xs text-white/70 mt-0.5">Did you eat the frog?</p>
              </div>
              <ChevronRight className="h-5 w-5 text-white" />
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}

function HabitCard({
  habit, done, onToggle, children, highlight = false,
}: {
  habit: HabitDefinition
  done: boolean
  onToggle: (key: string) => void
  children?: React.ReactNode
  highlight?: boolean
}) {
  const borderClass = done
    ? 'border-white/4 bg-white/2 opacity-50'
    : highlight
    ? 'border-primary/25 bg-primary/5'
    : 'border-white/8 bg-white/4'

  return (
    <div className={`rounded-lg border transition-all ${borderClass}`}>
      <button onClick={() => onToggle(habit.key)} className="flex items-start gap-3 w-full text-left px-4 py-3.5">
        <div className={`flex-shrink-0 mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
          done ? 'bg-primary border-primary' : 'border-white/20 hover:border-primary/60'
        }`}>
          {done && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold leading-tight ${done ? 'line-through text-white/25' : 'text-white'}`}>
            {habit.label}
          </p>
          {!done && <p className="text-xs text-white/35 mt-0.5 leading-relaxed">{habit.why}</p>}
        </div>
      </button>
      {children && <div className="px-4 pb-3.5">{children}</div>}
    </div>
  )
}
