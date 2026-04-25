import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: Request) {
  try {
    const { userId, title, body, url } = await req.json()

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)

    if (!subs || subs.length === 0) {
      return NextResponse.json({ ok: true, msg: 'Sin suscripciones' })
    }

    const payload = JSON.stringify({ title, body, url: url || '/gastos' })

    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub.subscription, payload)
      } catch {
        // Suscripción expirada, eliminar
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('subscription->>endpoint', sub.subscription.endpoint)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}