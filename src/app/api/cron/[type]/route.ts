import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDayInfo } from '@/lib/day'
import { getHabitsForDay } from '@/lib/habits'
import { format, subDays } from 'date-fns'

type NotificationType = 'wake' | 'checkin' | 'outreach' | 'evening' | 'winddown'
type Supabase = ReturnType<typeof createAdminClient>

interface PushPayload {
  title: string
  body: string
  url: string
}

// ── Per-user contextual message builders ──────────────────────────────────────

async function buildWake(
  supabase: Supabase,
  userId: string,
  yesterdayStr: string
): Promise<PushPayload> {
  const { data } = await supabase
    .from('evening_reflections')
    .select('tomorrow_signal')
    .eq('user_id', userId)
    .eq('date', yesterdayStr)
    .single()

  const signals: string[] = data?.tomorrow_signal ?? []

  if (signals.length > 0) {
    return {
      title: 'The Work',
      body: `6am. Your frog is waiting: "${signals[0]}". Laptop now.`,
      url: '/',
    }
  }
  return {
    title: 'The Work',
    body: '6am. The morning is your moat. No one is in your way yet.',
    url: '/',
  }
}

async function buildCheckin(
  supabase: Supabase,
  userId: string,
  todayStr: string
): Promise<PushPayload> {
  const [intentionRes, countRes] = await Promise.all([
    supabase
      .from('daily_intentions')
      .select('intention')
      .eq('user_id', userId)
      .eq('date', todayStr)
      .single(),
    supabase
      .from('habit_completions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('date', todayStr),
  ])

  const intention = intentionRes.data?.intention ?? null
  const done = countRes.count ?? 0

  if (intention) {
    if (done === 0) {
      return {
        title: 'The Work',
        body: `You committed to: "${intention}". Nothing logged yet. Start now.`,
        url: '/',
      }
    }
    return {
      title: 'The Work',
      body: `"${intention}" — ${done} habit${done !== 1 ? 's' : ''} done. Keep going.`,
      url: '/',
    }
  }

  if (done === 0) {
    return {
      title: 'The Work',
      body: "No intention set. What's your one thing? The morning moat is closing.",
      url: '/',
    }
  }

  return {
    title: 'The Work',
    body: `${done} habit${done !== 1 ? 's' : ''} done. What's driving the rest of the day?`,
    url: '/',
  }
}

async function buildOutreach(
  supabase: Supabase,
  userId: string,
  todayStr: string
): Promise<PushPayload> {
  const { data } = await supabase
    .from('vouch_outreach')
    .select('mass_count, personalised_name')
    .eq('user_id', userId)
    .eq('date', todayStr)
    .single()

  const mass = data?.mass_count ?? 0
  const name = data?.personalised_name ?? null

  if (mass > 0 && name) {
    return {
      title: 'The Work — Vouch',
      body: `${mass} sent, ${name} contacted. Execution mode.`,
      url: '/',
    }
  }
  if (mass > 0) {
    return {
      title: 'The Work — Vouch',
      body: `${mass} outreaches logged. Who's the one personal contact today?`,
      url: '/',
    }
  }
  if (name) {
    return {
      title: 'The Work — Vouch',
      body: `${name} contacted. Mass outreach still at zero — name your number.`,
      url: '/',
    }
  }
  return {
    title: 'The Work — Vouch',
    body: "2pm. No outreach logged. The founder who does the outreach wins.",
    url: '/',
  }
}

async function buildEvening(
  supabase: Supabase,
  userId: string,
  todayStr: string
): Promise<PushPayload | null> {
  const [eveningRes, countRes] = await Promise.all([
    supabase
      .from('evening_reflections')
      .select('id')
      .eq('user_id', userId)
      .eq('date', todayStr)
      .single(),
    supabase
      .from('habit_completions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('date', todayStr),
  ])

  // Already completed — don't send
  if (eveningRes.data) return null

  const done = countRes.count ?? 0
  const today = getDayInfo()
  const totalHabits = getHabitsForDay(today.type).length
  const pct = totalHabits > 0 ? Math.round((done / totalHabits) * 100) : 0

  if (pct >= 80) {
    return {
      title: 'The Work — Evening',
      body: `Strong day — ${done}/${totalHabits} done. Close it out.`,
      url: '/evening',
    }
  }
  if (done === 0) {
    return {
      title: 'The Work — Evening',
      body: "Nothing logged today. Honest reflection beats nothing. Evening check-in →",
      url: '/evening',
    }
  }
  return {
    title: 'The Work — Evening',
    body: `${done}/${totalHabits} habits done. What got in the way? Evening check-in →`,
    url: '/evening',
  }
}

async function buildWinddown(
  supabase: Supabase,
  userId: string,
  todayStr: string
): Promise<PushPayload> {
  const { data: evening } = await supabase
    .from('evening_reflections')
    .select('tomorrow_signal')
    .eq('user_id', userId)
    .eq('date', todayStr)
    .single()

  const today = getDayInfo()

  if (today.type === 'rest') {
    return {
      title: 'The Work — 10pm',
      body: 'Rest day ending. Sleep is part of the system. Lights out.',
      url: '/',
    }
  }

  const signals: string[] = evening?.tomorrow_signal ?? []
  if (signals.length > 0) {
    return {
      title: 'The Work — 10pm',
      body: "Tomorrow's signal set. 30 minutes to lights out. Sleep funds everything.",
      url: '/',
    }
  }
  if (evening) {
    return {
      title: 'The Work — 10pm',
      body: "30 minutes to lights out. Set tomorrow's Signal before you sleep.",
      url: '/evening',
    }
  }
  return {
    title: 'The Work — 10pm',
    body: "Evening check-in not done. 30 minutes to lights out — do it now.",
    url: '/evening',
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { type } = await params
  const validTypes: NotificationType[] = ['wake', 'checkin', 'outreach', 'evening', 'winddown']
  if (!validTypes.includes(type as NotificationType)) {
    return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 })
  }

  const supabase = createAdminClient()
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  const notifType = type as NotificationType

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!subscriptions?.length) return NextResponse.json({ sent: 0, message: 'No subscribers' })

  // Build per-user contextual payload
  const payloads = await Promise.all(
    subscriptions.map(async (row) => {
      let payload: PushPayload | null = null

      if (notifType === 'wake')      payload = await buildWake(supabase, row.user_id, yesterdayStr)
      else if (notifType === 'checkin')   payload = await buildCheckin(supabase, row.user_id, todayStr)
      else if (notifType === 'outreach')  payload = await buildOutreach(supabase, row.user_id, todayStr)
      else if (notifType === 'evening')   payload = await buildEvening(supabase, row.user_id, todayStr)
      else if (notifType === 'winddown')  payload = await buildWinddown(supabase, row.user_id, todayStr)

      return { subscription: row.subscription, payload }
    })
  )

  // Send only non-null payloads (null = already done, no need to notify)
  const toSend = payloads.filter((p) => p.payload !== null)
  const skipped = payloads.length - toSend.length

  const results = await Promise.allSettled(
    toSend.map((p) =>
      webpush.sendNotification(
        p.subscription as webpush.PushSubscription,
        JSON.stringify(p.payload)
      )
    )
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.length - sent

  return NextResponse.json({ type, sent, failed, skipped })
}
