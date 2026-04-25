import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { userId, subscription } = await req.json()

    if (!userId || !subscription) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    // Evitar duplicados por endpoint
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('subscription->>endpoint', subscription.endpoint)
      .single()

    if (!existing) {
      await supabase.from('push_subscriptions').insert({
        user_id: userId,
        subscription,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}