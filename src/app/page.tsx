import { createClient } from '@/lib/supabase/server'
import { getDayInfo, getPrincipleOfDay, getRelationshipPromptOfDay } from '@/lib/day'
import { getHabitsForDay } from '@/lib/habits'
import { detectCoachingInsight } from '@/lib/coaching'
import { HomeClient } from '@/components/HomeClient'
import { subDays, format } from 'date-fns'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = getDayInfo()
  const principle = getPrincipleOfDay()
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  const fourteenDaysAgo = format(subDays(new Date(), 14), 'yyyy-MM-dd')

  // Inject today's rotating relationship prompt into the habit definition
  const relationshipPrompt = getRelationshipPromptOfDay()
  const habits = getHabitsForDay(today.type).map((h) =>
    h.key === 'relationship'
      ? { ...h, label: relationshipPrompt.label, why: relationshipPrompt.why }
      : h
  )

  const [
    completionsResult,
    signalResult,
    outreachResult,
    eveningResult,
    intentionResult,
    historyResult,
    nonNegResult,
  ] = await Promise.all([
    supabase
      .from('habit_completions')
      .select('habit_key')
      .eq('user_id', user.id)
      .eq('date', today.dateStr),
    supabase
      .from('signal_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today.dateStr)
      .order('created_at', { ascending: true }),
    supabase
      .from('vouch_outreach')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today.dateStr)
      .single(),
    supabase
      .from('evening_reflections')
      .select('tomorrow_signal')
      .eq('user_id', user.id)
      .eq('date', yesterday)
      .single(),
    supabase
      .from('daily_intentions')
      .select('intention')
      .eq('user_id', user.id)
      .eq('date', today.dateStr)
      .single(),
    supabase
      .from('habit_completions')
      .select('habit_key, date')
      .eq('user_id', user.id)
      .gte('date', fourteenDaysAgo)
      .lt('date', today.dateStr),
    supabase
      .from('daily_priorities')
      .select('habit_keys')
      .eq('user_id', user.id)
      .eq('date', today.dateStr)
      .single(),
  ])

  const completedKeys = (completionsResult.data ?? []).map(
    (r: { habit_key: string }) => r.habit_key
  )
  const lastNightSignal: string[] = eveningResult.data?.tomorrow_signal ?? []
  const todayIntention: string | null = intentionResult.data?.intention ?? null
  const history = (historyResult.data ?? []) as { habit_key: string; date: string }[]
  const coachingInsight = detectCoachingInsight(history, today.dateStr)
  const dailyPriorities: string[] = nonNegResult.data?.habit_keys ?? []

  return (
    <HomeClient
      today={today}
      principle={principle}
      habits={habits}
      completedKeys={completedKeys}
      signalItems={signalResult.data ?? []}
      outreach={outreachResult.data ?? null}
      lastNightSignal={lastNightSignal}
      todayIntention={todayIntention}
      coachingInsight={coachingInsight}
      dailyPriorities={dailyPriorities}
    />
  )
}
