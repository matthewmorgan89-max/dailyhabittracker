'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, user }
}

// ─── Habit Completions ───────────────────────────────────────────────────────

export async function toggleHabitAction(habitKey: string, date: string) {
  const { supabase, user } = await getUser()

  const { data: existing } = await supabase
    .from('habit_completions')
    .select('id')
    .eq('user_id', user.id)
    .eq('habit_key', habitKey)
    .eq('date', date)
    .single()

  if (existing) {
    await supabase.from('habit_completions').delete().eq('id', existing.id)
  } else {
    await supabase.from('habit_completions').insert({
      user_id: user.id,
      habit_key: habitKey,
      date,
    })
  }

  revalidatePath('/')
}

// ─── Signal Items ─────────────────────────────────────────────────────────────

export async function addSignalItemAction(title: string, date: string) {
  const { supabase, user } = await getUser()

  await supabase.from('signal_items').insert({
    user_id: user.id,
    date,
    title: title.trim(),
  })

  revalidatePath('/')
}

export async function toggleSignalItemAction(id: string, completed: boolean) {
  const { supabase, user } = await getUser()

  await supabase
    .from('signal_items')
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/')
}

export async function deleteSignalItemAction(id: string) {
  const { supabase, user } = await getUser()

  await supabase
    .from('signal_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/')
}

// ─── Vouch Outreach ──────────────────────────────────────────────────────────

export async function updateVouchOutreachAction(
  date: string,
  massCount?: number,
  personalisedName?: string
) {
  const { supabase, user } = await getUser()

  await supabase.from('vouch_outreach').upsert(
    {
      user_id: user.id,
      date,
      ...(massCount !== undefined && { mass_count: massCount }),
      ...(personalisedName !== undefined && { personalised_name: personalisedName }),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,date' }
  )

  revalidatePath('/')
}

// ─── Daily Intention ─────────────────────────────────────────────────────────

export async function saveIntentionAction(date: string, intention: string) {
  const { supabase, user } = await getUser()

  await supabase.from('daily_intentions').upsert(
    { user_id: user.id, date, intention: intention.trim() },
    { onConflict: 'user_id,date' }
  )

  revalidatePath('/')
}

// ─── Evening Reflection ───────────────────────────────────────────────────────

export async function saveEveningReflectionAction(
  date: string,
  frogEaten: boolean,
  wins: string,
  tomorrowSignal: string[]
) {
  const { supabase, user } = await getUser()

  await supabase.from('evening_reflections').upsert(
    {
      user_id: user.id,
      date,
      frog_eaten: frogEaten,
      wins: wins.trim() || null,
      tomorrow_signal: tomorrowSignal.filter(Boolean),
    },
    { onConflict: 'user_id,date' }
  )

  revalidatePath('/evening')
}

// ─── Push Notifications ───────────────────────────────────────────────────────

export async function subscribePushAction(subscription: object) {
  const { supabase, user } = await getUser()

  await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      subscription,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
}

export async function unsubscribePushAction() {
  const { supabase, user } = await getUser()
  await supabase.from('push_subscriptions').delete().eq('user_id', user.id)
}

// ─── Weekly Reflection ────────────────────────────────────────────────────────

export async function saveWeeklyReflectionAction(
  weekStart: string,
  socialDone: boolean,
  reflection: string
) {
  const { supabase, user } = await getUser()

  await supabase.from('weekly_reflections').upsert(
    {
      user_id: user.id,
      week_start: weekStart,
      social_done: socialDone,
      reflection: reflection.trim() || null,
    },
    { onConflict: 'user_id,week_start' }
  )

  revalidatePath('/weekly')
}

// ─── Push Notifications ───────────────────────────────────────────────────────

export async function sendTestNotificationAction(message: string) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const { supabase, user } = await getUser()

  const { data } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', user.id)
    .single()

  if (!data) throw new Error('No push subscription found')

  await webpush.sendNotification(
    data.subscription as webpush.PushSubscription,
    JSON.stringify({
      title: 'The Work',
      body: message,
      url: '/',
    })
  )
}
