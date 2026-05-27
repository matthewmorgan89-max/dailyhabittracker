import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

const NOTIFICATIONS = {
  wake: {
    title: 'The Work',
    body: '6am. The morning is your moat. No one is in your way yet.',
    url: '/',
  },
  checkin: {
    title: 'The Work',
    body: 'Signal list set? Frog identified? Action starts emotion — open the app.',
    url: '/',
  },
  outreach: {
    title: 'The Work — Vouch',
    body: 'Outreach check. Where are you on your number? Name one person you\'ll contact today.',
    url: '/',
  },
  evening: {
    title: 'The Work — Evening',
    body: 'Did you eat the frog? Evening check-in is open.',
    url: '/evening',
  },
  winddown: {
    title: 'The Work — 10pm',
    body: '30 minutes to lights out. Phone down. Set tomorrow\'s Signal.',
    url: '/evening',
  },
} as const

type NotificationType = keyof typeof NOTIFICATIONS

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
  const notification = NOTIFICATIONS[type as NotificationType]
  if (!notification) {
    return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('subscription')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!subscriptions?.length) {
    return NextResponse.json({ sent: 0, message: 'No subscribers' })
  }

  const results = await Promise.allSettled(
    subscriptions.map((row) =>
      webpush.sendNotification(
        row.subscription as webpush.PushSubscription,
        JSON.stringify({
          title: notification.title,
          body: notification.body,
          url: notification.url,
        })
      )
    )
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.length - sent

  return NextResponse.json({ type, sent, failed })
}
