import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId, title, body, url } = await req.json()

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)

    if (!subs || subs.length === 0) {
      return NextResponse.json({ error: 'Sin suscripciones' }, { status: 404 })
    }

    const payload = JSON.stringify({ title, body, url: url || '/dashboard' })

    await Promise.all(subs.map(async (s: any) => {
      try {
        await webpush.sendNotification(s.subscription, payload)
      } catch (err) {
        console.error('Error enviando notificacion:', err)
      }
    }))

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Push error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId, subscription } = await req.json()

    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      subscription,
    }, { onConflict: 'user_id' })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}