import { subDays, format } from 'date-fns'
import { getDayInfo } from './day'
import { HABITS, getHabitsForDay } from './habits'

export interface CoachingInsight {
  habitKey: string
  message: string
}

interface Completion {
  habit_key: string
  date: string
}

// Check highest-impact habits first — if multiple patterns exist,
// surface the one that matters most to the goals
const PRIORITY_ORDER = [
  'mass_outreach',
  'personalised_outreach',
  'laptop_7am',
  'lights_out_10pm',
  'exercise',
  'deep_work_block',
  'goals_reviewed',
  'reading_30min',
  'partner_checkin',
  'phone_away',
]

function buildMessage(habitKey: string, missed: number, total: number): string {
  const m = missed
  const t = total
  const map: Record<string, string> = {
    mass_outreach:          `Mass outreach missed ${m} of your last ${t} Vouch days. This is the work. Everything else is preparation.`,
    personalised_outreach:  `1:1 outreach skipped ${m} of ${t} days. One real conversation moves faster than a hundred cold messages.`,
    laptop_7am:             `Late starts ${m} of the last ${t} days. The morning moat isn't being used. What moves the alarm?`,
    lights_out_10pm:        `Lights out missed ${m} of ${t} nights. Sleep funds everything else. This is the one you can't shortcut.`,
    exercise:               `Exercise skipped ${m} of the last ${t} days. You can't sustain mental rigour on a depleted body.`,
    deep_work_block:        `Deep work block unprotected ${m} of ${t} days. Shallow work is winning by default.`,
    goals_reviewed:         `Written goals skipped ${m} of ${t} mornings. Unwritten goals are wishes — review them or lose them.`,
    reading_30min:          `Reading missed ${m} of ${t} days. Most people won't. That's supposed to be your edge.`,
    partner_checkin:        `Partner check-in skipped ${m} of ${t} days. Relationships compound the same way interest does.`,
    phone_away:             `Phone down habit missed ${m} of ${t} days. Presence is the gift. The phone is the thief.`,
  }
  return map[habitKey] ?? `${habitKey} missed ${m} of ${t} applicable days.`
}

/**
 * Scans the last `daysBack` days of completions and returns the highest-priority
 * habit where the miss rate is 60%+ over at least 3 applicable days.
 * Returns null if no clear pattern exists (not enough data or doing well).
 */
export function detectCoachingInsight(
  completions: Completion[],
  todayStr: string,
  daysBack = 14
): CoachingInsight | null {
  const completionSet = new Set(completions.map((c) => `${c.habit_key}:${c.date}`))

  // Build the window of past days (yesterday and earlier, not today)
  const pastDays = Array.from({ length: daysBack }, (_, i) => {
    const date = subDays(new Date(todayStr), i + 1)
    return {
      dateStr: format(date, 'yyyy-MM-dd'),
      dayInfo: getDayInfo(date),
    }
  })

  for (const habitKey of PRIORITY_ORDER) {
    const habit = HABITS.find((h) => h.key === habitKey)
    if (!habit) continue

    // Days this habit was applicable
    const applicable = pastDays.filter((d) =>
      getHabitsForDay(d.dayInfo.type).some((h) => h.key === habitKey)
    )

    if (applicable.length < 3) continue // not enough signal yet

    const done = applicable.filter((d) =>
      completionSet.has(`${habitKey}:${d.dateStr}`)
    ).length
    const missed = applicable.length - done
    const missRate = missed / applicable.length

    if (missRate >= 0.6) {
      return {
        habitKey,
        message: buildMessage(habitKey, missed, applicable.length),
      }
    }
  }

  return null
}
