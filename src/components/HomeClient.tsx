'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Check, Plus, Trash2, ChevronRight, Zap, BarChart2, Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  toggleHabitAction,
  addSignalItemAction,
  toggleSignalItemAction,
  deleteSignalItemAction,
  updateVouchOutreachAction,
  subscribePushAction,
} from '@/app/actions'
import type { DayInfo } from '@/lib/day'
import type { HabitDefinition, HabitCategory } from '@/lib/habits'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/habits'

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
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export function HomeClient({ today, principle, habits, completedKeys, signalItems, outreach }: Props) {
  const [, startTransition] = useTransition()

  // Optimistic state
  const [optimisticCompleted, setOptimisticCompleted] = useState<Set<string>>(
    new Set(completedKeys)
  )
  const [localSignal, setLocalSignal] = useState<SignalItem[]>(signalItems)
  const [massCount, setMassCount] = useState(outreach?.mass_count?.toString() ?? '')
  const [personalisedName, setPersonalisedName] = useState(outreach?.personalised_name ?? '')
  const [signalInput, setSignalInput] = useState('')
  const [showSignalInput, setShowSignalInput] = useState(false)
  const signalInputRef = useRef<HTMLInputElement>(null)

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
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })
      const serialized = JSON.parse(JSON.stringify(sub))
      await subscribePushAction(serialized)
      setPushEnabled(true)
    } catch (e) {
      console.error('Push subscribe failed:', e)
    }
    setPushLoading(false)
  }

  useEffect(() => {
    if (showSignalInput) signalInputRef.current?.focus()
  }, [showSignalInput])

  // Sync props on server refresh
  useEffect(() => {
    setOptimisticCompleted(new Set(completedKeys))
    setLocalSignal(signalItems)
  }, [completedKeys, signalItems])

  const totalHabits = habits.length
  const doneCount = habits.filter((h) => optimisticCompleted.has(h.key)).length
  const signalDone = localSignal.filter((s) => s.completed).length
  const progressPct = totalHabits > 0 ? Math.round((doneCount / totalHabits) * 100) : 0

  function toggleHabit(key: string) {
    const next = new Set(optimisticCompleted)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setOptimisticCompleted(next)

    startTransition(() => {
      toggleHabitAction(key, today.dateStr)
    })
  }

  function addSignalItem() {
    if (!signalInput.trim()) return
    const temp: SignalItem = {
      id: `temp-${Date.now()}`,
      title: signalInput.trim(),
      completed: false,
    }
    setLocalSignal((prev) => [...prev, temp])
    setSignalInput('')
    setShowSignalInput(false)

    startTransition(() => {
      addSignalItemAction(temp.title, today.dateStr)
    })
  }

  function toggleSignal(id: string, current: boolean) {
    setLocalSignal((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !current } : s))
    )
    startTransition(() => {
      toggleSignalItemAction(id, !current)
    })
  }

  function deleteSignal(id: string) {
    setLocalSignal((prev) => prev.filter((s) => s.id !== id))
    startTransition(() => {
      deleteSignalItemAction(id)
    })
  }

  function handleMassCountBlur() {
    const val = parseInt(massCount) || 0
    if (val > 0) {
      const prev = outreach?.mass_count ?? 0
      if (val !== prev) {
        // Also mark the habit as complete if count > 0
        if (!optimisticCompleted.has('mass_outreach')) {
          setOptimisticCompleted((prev) => new Set([...prev, 'mass_outreach']))
          startTransition(() => {
            toggleHabitAction('mass_outreach', today.dateStr)
          })
        }
        startTransition(() => {
          updateVouchOutreachAction(today.dateStr, val, undefined)
        })
      }
    }
  }

  function handlePersonalisedNameBlur() {
    if (personalisedName !== (outreach?.personalised_name ?? '')) {
      if (personalisedName.trim() && !optimisticCompleted.has('personalised_outreach')) {
        setOptimisticCompleted((prev) => new Set([...prev, 'personalised_outreach']))
        startTransition(() => {
          toggleHabitAction('personalised_outreach', today.dateStr)
        })
      }
      startTransition(() => {
        updateVouchOutreachAction(today.dateStr, undefined, personalisedName.trim())
      })
    }
  }

  const byCategory = CATEGORY_ORDER.reduce<Record<HabitCategory, HabitDefinition[]>>(
    (acc, cat) => {
      acc[cat] = habits.filter((h) => h.category === cat)
      return acc
    },
    { morning: [], vouch: [], body: [], mind: [], partner: [] }
  )

  const dayBadgeVariant =
    today.type === 'office' ? 'default' : today.type === 'rest' ? 'secondary' : 'outline'

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 pb-24">

      {/* ── Header ── */}
      <div className="pt-10 pb-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">The Work</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{today.displayDate}</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={dayBadgeVariant}>{today.label}</Badge>
            <Link href="/weekly" className="text-muted-foreground hover:text-foreground transition-colors" title="This week">
              <BarChart2 className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* Push notification prompt */}
        {pushEnabled === false && (
          <button
            onClick={enablePush}
            disabled={pushLoading}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell className="h-3.5 w-3.5" />
            {pushLoading ? 'Enabling...' : 'Enable daily reminders'}
          </button>
        )}

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{doneCount} of {totalHabits} habits done</span>
            <span>{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-1.5" />
        </div>

        {/* Principle of the day */}
        <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-1">
          <p className="text-sm leading-relaxed text-muted-foreground italic">&ldquo;{principle.text}&rdquo;</p>
          <p className="text-xs text-muted-foreground/60">— {principle.source}</p>
        </div>
      </div>

      {/* ── Signal Section ── */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-amber-500" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-500">
            Signal — Mission Critical
          </h2>
          {localSignal.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              {signalDone}/{localSignal.length}
            </span>
          )}
        </div>

        <div className="space-y-2">
          {localSignal.length === 0 && !showSignalInput && (
            <p className="text-sm text-muted-foreground px-1">
              No signal items yet. What&apos;s mission critical today?
            </p>
          )}

          {localSignal.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-3 group"
            >
              <button
                onClick={() => toggleSignal(item.id, item.completed)}
                className={`flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                  item.completed
                    ? 'bg-amber-500 border-amber-500'
                    : 'border-amber-500/50 hover:border-amber-500'
                }`}
              >
                {item.completed && <Check className="h-3 w-3 text-black" />}
              </button>
              <span className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                {item.title}
              </span>
              <button
                onClick={() => deleteSignal(item.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {showSignalInput ? (
            <div className="flex gap-2">
              <Input
                ref={signalInputRef}
                value={signalInput}
                onChange={(e) => setSignalInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addSignalItem()
                  if (e.key === 'Escape') setShowSignalInput(false)
                }}
                placeholder="What's mission critical today?"
                className="h-10 text-sm"
              />
              <Button size="sm" onClick={addSignalItem} disabled={!signalInput.trim()}>
                Add
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setShowSignalInput(true)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-amber-500 transition-colors px-1 py-1"
            >
              <Plus className="h-4 w-4" />
              Add signal item
            </button>
          )}
        </div>
      </section>

      {/* ── Habit Sections ── */}
      {today.type === 'rest' ? (
        <div className="rounded-lg border border-border bg-card px-4 py-6 text-center space-y-2">
          <p className="font-medium">Sunday — Rest.</p>
          <p className="text-sm text-muted-foreground">
            Recovery is part of the system. Set your Signal list for Monday.
          </p>
          <Link href="/evening" className="text-sm text-primary underline underline-offset-4 inline-block mt-2">
            Plan tomorrow &rarr;
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {CATEGORY_ORDER.map((cat) => {
            const catHabits = byCategory[cat]
            if (catHabits.length === 0) return null

            return (
              <section key={cat}>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  {CATEGORY_LABELS[cat]}
                </h2>
                <div className="space-y-2">
                  {catHabits.map((habit) => {
                    const done = optimisticCompleted.has(habit.key)

                    if (cat === 'vouch' && habit.key === 'mass_outreach') {
                      return (
                        <HabitCard key={habit.key} habit={habit} done={done} onToggle={toggleHabit}>
                          {done || massCount ? (
                            <div className="flex items-center gap-2 mt-2 ml-8">
                              <Input
                                type="number"
                                min="0"
                                value={massCount}
                                onChange={(e) => setMassCount(e.target.value)}
                                onBlur={handleMassCountBlur}
                                placeholder="0"
                                className="h-7 w-20 text-xs"
                              />
                              <span className="text-xs text-muted-foreground">outreaches today</span>
                            </div>
                          ) : null}
                        </HabitCard>
                      )
                    }

                    if (cat === 'vouch' && habit.key === 'personalised_outreach') {
                      return (
                        <HabitCard key={habit.key} habit={habit} done={done} onToggle={toggleHabit}>
                          {done || personalisedName ? (
                            <div className="flex items-center gap-2 mt-2 ml-8">
                              <Input
                                value={personalisedName}
                                onChange={(e) => setPersonalisedName(e.target.value)}
                                onBlur={handlePersonalisedNameBlur}
                                placeholder="Who did you reach out to?"
                                className="h-7 text-xs"
                              />
                            </div>
                          ) : null}
                        </HabitCard>
                      )
                    }

                    return (
                      <HabitCard key={habit.key} habit={habit} done={done} onToggle={toggleHabit}>
                        {habit.key === 'exercise' && today.showLunchExercise && !done && (
                          <p className="text-xs text-amber-500 ml-8 mt-1">Lunch today — office day</p>
                        )}
                      </HabitCard>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* ── Evening check-in CTA ── */}
      {isAfter5pm && (
        <div className="fixed bottom-6 left-0 right-0 px-4 max-w-lg mx-auto">
          <Link href="/evening">
            <div className="rounded-xl border border-border bg-card/90 backdrop-blur px-4 py-3 flex items-center justify-between shadow-lg">
              <div>
                <p className="font-medium text-sm">Evening check-in</p>
                <p className="text-xs text-muted-foreground">Did you eat the frog?</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}

function HabitCard({
  habit,
  done,
  onToggle,
  children,
}: {
  habit: HabitDefinition
  done: boolean
  onToggle: (key: string) => void
  children?: React.ReactNode
}) {
  return (
    <div
      className={`rounded-lg border bg-card px-3 py-3 transition-colors ${
        done ? 'border-border/50 opacity-60' : 'border-border'
      }`}
    >
      <button
        onClick={() => onToggle(habit.key)}
        className="flex items-start gap-3 w-full text-left"
      >
        <div
          className={`flex-shrink-0 mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
            done ? 'bg-primary border-primary' : 'border-muted-foreground/40 hover:border-primary'
          }`}
        >
          {done && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-tight ${done ? 'line-through text-muted-foreground' : ''}`}>
            {habit.label}
          </p>
          {!done && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{habit.why}</p>
          )}
        </div>
      </button>
      {children}
    </div>
  )
}
