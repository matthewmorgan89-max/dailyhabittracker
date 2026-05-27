import { createClient } from '@/lib/supabase/server'
import { getDayInfo } from '@/lib/day'
import { HABITS } from '@/lib/habits'
import { WeeklyClient } from '@/components/WeeklyClient'
import { startOfWeek, addDays, subDays, format } from 'date-fns'
import type { DayType } from '@/lib/day'
import type { HabitDefinition } from '@/lib/habits'

function calcStreak(completedDates: Set<string>, today: Date): number {
  let streak = 0
  let d = new Date(today)

  if (!completedDates.has(format(d, 'yyyy-MM-dd'))) {
    d = subDays(d, 1)
  }

  while (completedDates.has(format(d, 'yyyy-MM-dd'))) {
    streak++
    d = subDays(d, 1)
  }

  return streak
}

function dayTypeFromDate(dateStr: string): DayType {
  const dow = new Date(dateStr + 'T12:00:00').getDay()
  if (dow === 0) return 'rest'
  if (dow >= 2 && dow <= 4) return 'office'
  if (dow === 6) return 'saturday'
  return 'wfh'
}

function habitAppliesOnDate(habit: HabitDefinition, dateStr: string): boolean {
  const dt = dayTypeFromDate(dateStr)
  if (dt === 'rest') return false
  if (habit.appliesTo === 'all') return true
  if (habit.appliesTo === 'vouch_days') return true
  if (habit.appliesTo === 'workdays') return dt === 'office' || dt === 'wfh'
  if (habit.appliesTo === 'office_days') return dt === 'office'
  return false
}

export default async function WeeklyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = getDayInfo()
  const todayDate = new Date()

  const weekStart = startOfWeek(todayDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    format(addDays(weekStart, i), 'yyyy-MM-dd')
  )
  const weekStartStr = weekDays[0]
  const weekLabel = `${format(weekStart, 'd MMM')} – ${format(addDays(weekStart, 6), 'd MMM')}`

  const sixtyDaysAgo = format(subDays(todayDate, 60), 'yyyy-MM-dd')

  const [completionsResult, weeklyReflectionResult] = await Promise.all([
    supabase
      .from('habit_completions')
      .select('habit_key, date')
      .eq('user_id', user.id)
      .gte('date', sixtyDaysAgo),
    supabase
      .from('weekly_reflections')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekStartStr)
      .single(),
  ])

  // habit_key → Set<dateStr> for streak calc
  const byHabit: Record<string, Set<string>> = {}
  for (const row of completionsResult.data ?? []) {
    if (!byHabit[row.habit_key]) byHabit[row.habit_key] = new Set()
    byHabit[row.habit_key].add(row.date)
  }

  const streaks: Record<string, number> = {}
  const weekCompletionMap: Record<string, string[]> = {}
  const applicabilityMap: Record<string, boolean[]> = {}

  for (const habit of HABITS) {
    const dates = byHabit[habit.key] ?? new Set<string>()
    streaks[habit.key] = calcStreak(dates, todayDate)
    weekCompletionMap[habit.key] = weekDays.filter((d) => dates.has(d))
    applicabilityMap[habit.key] = weekDays.map((d) => habitAppliesOnDate(habit, d))
  }

  // Count applicable habit-days this week (up to today) for overall %
  const todayStr = today.dateStr
  const pastDays = weekDays.filter((d) => d <= todayStr)
  let totalApplicable = 0
  let totalDone = 0
  for (const habit of HABITS) {
    for (const d of pastDays) {
      if (habitAppliesOnDate(habit, d)) {
        totalApplicable++
        if (byHabit[habit.key]?.has(d)) totalDone++
      }
    }
  }
  const weekPct = totalApplicable > 0 ? Math.round((totalDone / totalApplicable) * 100) : 0

  return (
    <WeeklyClient
      today={today}
      weekDays={weekDays}
      weekLabel={weekLabel}
      weekStartStr={weekStartStr}
      weekPct={weekPct}
      habits={HABITS}
      weekCompletionMap={weekCompletionMap}
      applicabilityMap={applicabilityMap}
      streaks={streaks}
      existingReflection={weeklyReflectionResult.data ?? null}
    />
  )
}
