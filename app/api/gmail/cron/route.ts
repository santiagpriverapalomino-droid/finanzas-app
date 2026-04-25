import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Obtener todos los usuarios con Gmail conectado
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('gmail_connected', true)

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ ok: true, msg: 'No hay usuarios con Gmail conectado' })
  }

  const results = []
  for (const profile of profiles) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/gmail/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: profile.id })
    })
    const data = await res.json()
    results.push({ userId: profile.id, ...data })
  }

  return NextResponse.json({ ok: true, results })
}