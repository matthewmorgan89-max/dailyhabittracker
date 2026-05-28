import { createClient } from '@/lib/supabase/server'
import { getDayInfo, getPrincipleOfDay } from '@/lib/day'
import { getHabitsForDay } from '@/lib/habits'
import { HomeClient } from '@/components/HomeClient'
import { subDays, format } from 'date-fns'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = getDayInfo()
  const principle = getPrincipleOfDay()
  const habits = getHabitsForDay(today.type)
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  const [completionsResult, signalResult, outreachResult, eveningResult, intentionResult] = await Promise.all([
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
  ])

  const completedKeys = (completionsResult.data ?? []).map(
    (r: { habit_key: string }) => r.habit_key
  )

  const lastNightSignal: string[] = eveningResult.data?.tomorrow_signal ?? []
  const todayIntention: string | null = intentionResult.data?.intention ?? null

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
    />
  )
}
