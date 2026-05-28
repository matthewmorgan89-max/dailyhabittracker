'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Flame, Users } from 'lucide-react'
import { saveWeeklyReflectionAction } from '@/app/actions'
import type { DayInfo } from '@/lib/day'
import type { HabitDefinition } from '@/lib/habits'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/habits'

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

interface WeeklyReflection {
  social_done: boolean
  reflection: string | null
}

interface Props {
  today: DayInfo
  weekDays: string[]
  weekLabel: string
  weekStartStr: string
  weekPct: number
  habits: HabitDefinition[]
  weekCompletionMap: Record<string, string[]>
  applicabilityMap: Record<string, boolean[]>
  streaks: Record<string, number>
  existingReflection: WeeklyReflection | null
}

export function WeeklyClient({
  today,
  weekDays,
  weekLabel,
  weekStartStr,
  weekPct,
  habits,
  weekCompletionMap,
  applicabilityMap,
  streaks,
  existingReflection,
}: Props) {
  const [, startTransition] = useTransition()
  const [socialDone, setSocialDone] = useState(existingReflection?.social_done ?? false)
  const [reflection, setReflection] = useState(existingReflection?.reflection ?? '')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    startTransition(async () => {
      await saveWeeklyReflectionAction(weekStartStr, socialDone, reflection)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const byCategory = CATEGORY_ORDER.reduce<Record<string, HabitDefinition[]>>(
    (acc, cat) => { acc[cat] = habits.filter((h) => h.category === cat); return acc }, {}
  )

  const pctColor = weekPct >= 80 ? 'text-primary' : weekPct >= 50 ? 'text-white' : 'text-white/40'
  const pctMessage = weekPct >= 80
    ? 'Exceptional. Keep this standard.'
    : weekPct >= 60
    ? 'Solid. Finish strong.'
    : weekPct >= 40
    ? 'What one habit would move this number?'
    : 'The week isn\'t over. What\'s one change today?'

  return (
    <div className="min-h-screen bg-black max-w-lg mx-auto px-5 pb-24">

      {/* Header */}
      <div className="pt-10 pb-8 space-y-5">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-white/30 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">This Week.</h1>
            <p className="text-white/40 text-sm">{weekLabel}</p>
          </div>
        </div>

        {/* Big % */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-3">
            <span className={`text-6xl font-black tabular-nums ${pctColor}`}>{weekPct}%</span>
            <span className="text-white/30 text-sm">completion</span>
          </div>
          <div className="h-1 bg-white/8 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${weekPct}%` }} />
          </div>
          <p className="text-xs text-white/40">{pctMessage}</p>
        </div>
      </div>

      {/* Habits by category */}
      <div className="space-y-7 mb-10">
        {CATEGORY_ORDER.map((cat) => {
          const catHabits = byCategory[cat]
          if (!catHabits?.length) return null

          return (
            <section key={cat}>
              <h2 className="text-xs font-black uppercase tracking-widest text-white/25 mb-3">
                {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]}
              </h2>
              <div className="space-y-2">
                {catHabits.map((habit) => {
                  const completed = new Set(weekCompletionMap[habit.key] ?? [])
                  const applies = applicabilityMap[habit.key] ?? []
                  const streak = streaks[habit.key] ?? 0
                  const daysApplicable = applies.filter(Boolean).length
                  const daysDone = applies.filter((a, i) => a && completed.has(weekDays[i])).length

                  return (
                    <div key={habit.key} className="bg-white/4 border border-white/8 rounded-lg px-4 py-3">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-sm font-semibold text-white">{habit.label}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {streak > 0 && (
                            <span className="flex items-center gap-1 text-xs font-bold text-primary">
                              <Flame className="h-3 w-3" />
                              {streak}d
                            </span>
                          )}
                          <span className="text-xs text-white/25">{daysDone}/{daysApplicable}</span>
                        </div>
                      </div>

                      {/* Week dots */}
                      <div className="flex gap-1">
                        {weekDays.map((day, i) => {
                          const isToday = day === today.dateStr
                          const isFuture = day > today.dateStr
                          const doesApply = applies[i]
                          const isDone = completed.has(day)

                          if (!doesApply) return (
                            <div key={day} className="flex flex-col items-center gap-1 flex-1">
                              <span className="text-[10px] text-white/15">{DAY_LABELS[i]}</span>
                              <div className="h-1 w-full bg-white/8 rounded-full" />
                            </div>
                          )

                          if (isFuture) return (
                            <div key={day} className="flex flex-col items-center gap-1 flex-1">
                              <span className="text-[10px] text-white/15">{DAY_LABELS[i]}</span>
                              <div className="h-4 w-4 mx-auto rounded-full border border-white/10" />
                            </div>
                          )

                          return (
                            <div key={day} className="flex flex-col items-center gap-1 flex-1">
                              <span className={`text-[10px] font-bold ${isToday ? 'text-white' : 'text-white/15'}`}>
                                {DAY_LABELS[i]}
                              </span>
                              <div className={`h-4 w-4 mx-auto rounded-full transition-colors ${
                                isDone ? 'bg-primary' : isToday ? 'border-2 border-primary/40' : 'border border-white/15'
                              }`} />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {/* Social Energy */}
      <section className="mb-8 space-y-3">
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-white/25 mb-1">Social Energy</h2>
          <p className="text-lg font-black uppercase tracking-tight">Real social time?</p>
        </div>
        <button
          onClick={() => setSocialDone(!socialDone)}
          className={`w-full rounded-xl border px-5 py-4 text-left transition-all space-y-1 ${
            socialDone ? 'border-primary bg-primary/10' : 'border-white/8 bg-white/4'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              socialDone ? 'bg-primary border-primary' : 'border-white/20'
            }`}>
              {socialDone && <div className="h-2 w-2 rounded-sm bg-white" />}
            </div>
            <p className="text-sm font-bold text-white">Friend, hobby, or face-to-face meeting</p>
          </div>
          <p className="text-xs text-white/30 ml-8">
            You&apos;re an extrovert. Isolation is a performance drain, not a discipline badge.
          </p>
        </button>
      </section>

      {/* Reflection */}
      <section className="mb-8 space-y-3">
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-white/25 mb-1">Weekly Reflection</h2>
          <p className="text-lg font-black uppercase tracking-tight">What moved? What slipped?</p>
        </div>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="Honesty > performance. What's the one thing to double down on next week?"
          className="w-full bg-white/4 border border-white/8 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-primary transition-colors"
          rows={4}
        />
      </section>

      <button
        onClick={handleSave}
        className="w-full h-14 bg-primary rounded-xl font-black uppercase tracking-wide text-white text-sm"
      >
        {saved ? 'Saved ✓' : 'Save reflection →'}
      </button>
    </div>
  )
}
