'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Flame, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
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
    (acc, cat) => {
      acc[cat] = habits.filter((h) => h.category === cat)
      return acc
    },
    {}
  )

  const pctColor =
    weekPct >= 80 ? 'text-emerald-400' : weekPct >= 50 ? 'text-amber-400' : 'text-muted-foreground'

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 pb-24">
      {/* Header */}
      <div className="pt-10 pb-6 space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">This Week</h1>
            <p className="text-muted-foreground text-sm">{weekLabel}</p>
          </div>
        </div>

        {/* Overall completion */}
        <div className="rounded-lg border border-border bg-card px-4 py-4 space-y-2">
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold tabular-nums ${pctColor}`}>{weekPct}%</span>
            <span className="text-muted-foreground text-sm">habit completion so far</span>
          </div>
          <Progress value={weekPct} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            {weekPct >= 80
              ? 'Exceptional week. Keep this standard.'
              : weekPct >= 60
              ? 'Solid. A few more days to finish strong.'
              : weekPct >= 40
              ? 'Middle of the pack. What\'s the one habit that would move this?'
              : 'The week isn\'t over. What\'s one thing you\'ll do differently today?'}
          </p>
        </div>
      </div>

      {/* Habit Grids by Category */}
      <div className="space-y-6 mb-8">
        {CATEGORY_ORDER.map((cat) => {
          const catHabits = byCategory[cat]
          if (!catHabits?.length) return null

          return (
            <section key={cat}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
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
                    <div key={habit.key} className="rounded-lg border border-border bg-card px-3 py-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-sm font-medium leading-tight">{habit.label}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {streak > 0 && (
                            <Badge variant="secondary" className="text-xs gap-1 px-1.5">
                              <Flame className="h-3 w-3 text-amber-400" />
                              {streak}d
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {daysDone}/{daysApplicable}
                          </span>
                        </div>
                      </div>

                      {/* Week dots */}
                      <div className="flex gap-1.5">
                        {weekDays.map((day, i) => {
                          const isToday = day === today.dateStr
                          const isFuture = day > today.dateStr
                          const doesApply = applies[i]
                          const isDone = completed.has(day)

                          if (!doesApply) {
                            return (
                              <div key={day} className="flex flex-col items-center gap-0.5 flex-1">
                                <span className="text-[10px] text-muted-foreground/40">{DAY_LABELS[i]}</span>
                                <div className="h-5 w-5 flex items-center justify-center">
                                  <div className="h-0.5 w-2 bg-muted-foreground/20 rounded" />
                                </div>
                              </div>
                            )
                          }

                          if (isFuture) {
                            return (
                              <div key={day} className="flex flex-col items-center gap-0.5 flex-1">
                                <span className="text-[10px] text-muted-foreground/40">{DAY_LABELS[i]}</span>
                                <div className="h-5 w-5 rounded-full border border-muted-foreground/20" />
                              </div>
                            )
                          }

                          return (
                            <div key={day} className="flex flex-col items-center gap-0.5 flex-1">
                              <span className={`text-[10px] ${isToday ? 'text-foreground font-medium' : 'text-muted-foreground/40'}`}>
                                {DAY_LABELS[i]}
                              </span>
                              <div
                                className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  isDone
                                    ? 'bg-primary border-primary'
                                    : isToday
                                    ? 'border-primary/50'
                                    : 'border-muted-foreground/30'
                                }`}
                              >
                                {isDone && <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                              </div>
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
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Social Energy
          </h2>
        </div>
        <div
          onClick={() => setSocialDone(!socialDone)}
          className={`rounded-lg border cursor-pointer px-4 py-4 transition-colors space-y-1 ${
            socialDone ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                socialDone ? 'bg-primary border-primary' : 'border-muted-foreground/40'
              }`}
            >
              {socialDone && <div className="h-2 w-2 rounded-sm bg-primary-foreground" />}
            </div>
            <p className="text-sm font-medium">Real social time this week</p>
          </div>
          <p className="text-xs text-muted-foreground ml-8">
            Friend catch-up, hobby, or face-to-face meeting instead of a call.
            You&apos;re an extrovert — isolation is a performance drain, not a discipline badge.
          </p>
        </div>
      </section>

      {/* Reflection */}
      <section className="mb-8 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Weekly Reflection
        </h2>
        <p className="text-xs text-muted-foreground">
          What moved this week? What slipped? What&apos;s the one thing to double down on next week?
        </p>
        <Textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="Write it here. Honesty > performance."
          className="text-sm resize-none"
          rows={4}
        />
      </section>

      <Button onClick={handleSave} className="w-full h-11">
        {saved ? 'Saved' : 'Save reflection'}
      </Button>
    </div>
  )
}
