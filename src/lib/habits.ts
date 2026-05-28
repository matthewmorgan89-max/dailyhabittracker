import type { DayType } from './day'

export type HabitCategory = 'morning' | 'vouch' | 'body' | 'mind' | 'relationships'

export interface HabitDefinition {
  key: string
  label: string
  category: HabitCategory
  why: string
  appliesTo: 'all' | 'vouch_days' | 'workdays' | 'office_days'
  isQuantified?: boolean
  quantifiedLabel?: string
}

export const HABITS: HabitDefinition[] = [
  // MORNING
  {
    key: 'laptop_7am',
    label: 'Laptop by 7:30am',
    category: 'morning',
    why: 'The morning is your moat. No one is in your way yet.',
    appliesTo: 'vouch_days',
  },
  {
    key: 'journaling',
    label: 'Morning journal',
    category: 'morning',
    why: "5 minutes. What's on your mind, what you're grateful for, what you need to solve. Bartlett calls it his most important habit — clarity before noise.",
    appliesTo: 'vouch_days',
  },
  {
    key: 'goals_reviewed',
    label: 'Written goals reviewed',
    category: 'morning',
    why: 'Unwritten goals are wishes. Reading them makes them real.',
    appliesTo: 'vouch_days',
  },

  // VOUCH
  {
    key: 'social_media_post',
    label: 'Post about Vouch',
    category: 'vouch',
    why: 'The founder who builds in public wins. Your personal brand is Vouch\'s cheapest marketing channel.',
    appliesTo: 'vouch_days',
  },
  {
    key: 'mass_outreach',
    label: 'Mass market outreach',
    category: 'vouch',
    why: 'Outreach is the work. Everything else is preparation.',
    appliesTo: 'vouch_days',
    isQuantified: true,
    quantifiedLabel: 'How many?',
  },
  {
    key: 'personalised_outreach',
    label: '1:1 personalised outreach',
    category: 'vouch',
    why: 'One real conversation moves faster than a hundred cold messages.',
    appliesTo: 'vouch_days',
    isQuantified: true,
    quantifiedLabel: 'Who?',
  },

  // BODY
  {
    key: 'exercise',
    label: 'Exercise',
    category: 'body',
    why: 'You cannot sustain mental rigour on a depleted body.',
    appliesTo: 'all',
  },
  {
    key: 'lights_out_10pm',
    label: 'Lights out by 10pm',
    category: 'body',
    why: 'Sleep funds everything else. It is not optional.',
    appliesTo: 'all',
  },

  // MIND
  {
    key: 'deep_work_block',
    label: 'Deep work block protected',
    category: 'mind',
    why: 'Shallow work expands to fill the time you give it.',
    appliesTo: 'workdays',
  },
  {
    key: 'reading_30min',
    label: 'Non-fiction book or podcast',
    category: 'mind',
    why: "30 minutes in your field. Most people won't. That's the edge.",
    appliesTo: 'all',
  },

  // RELATIONSHIPS — single rotating daily habit
  {
    key: 'relationship',
    label: 'Relationship action', // overridden in page.tsx with today's rotating prompt
    category: 'relationships',
    why: 'Relationships compound the same way interest does. One real gesture every day.',
    appliesTo: 'all',
  },
]

export const CATEGORY_LABELS: Record<HabitCategory, string> = {
  morning: 'Morning',
  vouch: 'Vouch',
  body: 'Body',
  mind: 'Mind',
  relationships: 'Relationships',
}

export function getHabitsForDay(dayType: DayType): HabitDefinition[] {
  return HABITS.filter((h) => {
    if (dayType === 'rest') return false
    if (h.appliesTo === 'all') return true
    if (h.appliesTo === 'vouch_days') return true // Mon–Sat
    if (h.appliesTo === 'workdays') return dayType === 'office' || dayType === 'wfh'
    if (h.appliesTo === 'office_days') return dayType === 'office'
    return false
  })
}

export const CATEGORY_ORDER: HabitCategory[] = ['morning', 'vouch', 'body', 'mind', 'relationships']

// Habits eligible to be daily priorities (excludes rotating relationship habit)
export const PRIORITY_ELIGIBLE = HABITS.filter((h) => h.key !== 'relationship')
