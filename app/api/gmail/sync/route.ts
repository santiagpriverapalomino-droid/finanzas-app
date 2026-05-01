
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function refreshToken(refresh_token: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  return data.access_token
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

async function extraerConIA(subject: string, body: string, date: string): Promise<any | null> {
  try {
    const prompt = `Eres un extractor de gastos bancarios peruanos. Analiza este email.

Asunto: ${subject}
Fecha: ${date}
Contenido: ${body.slice(0, 500)}

Responde SOLO con JSON:
{"es_gasto":true,"monto":50.19,"moneda":"PEN","descripcion":"RAPPI PERU","categoria":"Alimentación","fecha":"2024-04-23"}

Categorías válidas: Alimentación, Transporte, Entretenimiento, Compras, Servicios, Salud
Si es devolución, reembolso o anulación responde: {"es_gasto":false}
Si no hay monto claro responde: {"es_gasto":false}`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }]
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()
    const gasto = JSON.parse(clean)
    return gasto.es_gasto && gasto.monto > 0 ? gasto : null
  } catch {
    return null
  }
}

async function procesarEmail(msgId: string, accessToken: string): Promise<any | null> {
  const msgRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const msgData = await msgRes.json()

  let rawBody = ''
  const parts = msgData.payload?.parts || [msgData.payload]
  for (const part of parts) {
    if (part?.body?.data) rawBody += Buffer.from(part.body.data, 'base64').toString('utf-8')
    if (part?.parts) {
      for (const subpart of part.parts) {
        if (subpart?.body?.data) rawBody += Buffer.from(subpart.body.data, 'base64').toString('utf-8')
      }
    }
  }

  const body = stripHtml(rawBody)
  const subject = msgData.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || ''
  const date = msgData.payload?.headers?.find((h: any) => h.name === 'Date')?.value || ''

  return extraerConIA(subject, body, date)
}

export async function POST(req: Request) {
  try {
    const { userId } = await req.json()

    const { data: profile } = await supabase
      .from('profiles')
      .select('gmail_access_token, gmail_refresh_token, gmail_connected, gmail_first_sync_done')
      .eq('id', userId)
      .single()

    if (!profile?.gmail_connected) {
      return NextResponse.json({ ok: false, error: 'Gmail no conectado' })
    }

    let accessToken = profile.gmail_access_token
    if (profile.gmail_refresh_token) {
      accessToken = await refreshToken(profile.gmail_refresh_token)
      await supabase.from('profiles').update({ gmail_access_token: accessToken }).eq('id', userId)
    }

    // Buscar emails del mes actual — BCP y Yape
    const now = new Date()
    const hace30dias = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const afterDate = `${hace30dias.getFullYear()}/${String(hace30dias.getMonth()+1).padStart(2,'0')}/${String(hace30dias.getDate()).padStart(2,'0')}`
    
    const query = encodeURIComponent(`from:(notificacionesbcp.com.pe OR yape) after:${afterDate}`)

    const gmailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const gmailData = await gmailRes.json()

    if (!gmailData.messages || gmailData.messages.length === 0) {
      return NextResponse.json({ ok: true, gastos: 0, insertados: 0, msg: 'Sin emails este mes' })
    }

    // Procesar en lotes de 5 para no saturar rate limit
    const mensajes = gmailData.messages
    const gastos: any[] = []

    for (let i = 0; i < mensajes.length; i += 5) {
      const lote = mensajes.slice(i, i + 5)
      const resultados = await Promise.all(
        lote.map((msg: any) => procesarEmail(msg.id, accessToken))
      )
      gastos.push(...resultados.filter(Boolean))
      // Pausa entre lotes para no superar rate limit
      if (i + 5 < mensajes.length) {
        await new Promise(r => setTimeout(r, 2000))
      }
    }

    let insertados = 0
    const FIXED = ['Alimentación', 'Transporte', 'Entretenimiento', 'Compras', 'Servicios', 'Salud']

    for (const gasto of gastos) {
      const { data: existing } = await supabase
        .from('expenses')
        .select('id')
        .eq('user_id', userId)
        .eq('amount', gasto.monto)
        .eq('date', gasto.fecha)
        .single()

      if (!existing) {
        await supabase.from('expenses').insert({
          user_id: userId,
          amount: gasto.monto,
          currency: gasto.moneda,
          description: gasto.descripcion,
          category: gasto.categoria,
          date: gasto.fecha,
          source: 'gmail',
        })
        insertados++

        if (!FIXED.includes(gasto.categoria)) {
          const { data: prof } = await supabase.from('profiles').select('custom_categories').eq('id', userId).single()
          const currentCats: string[] = prof?.custom_categories || []
          if (!currentCats.includes(gasto.categoria)) {
            await supabase.from('profiles').update({
              custom_categories: [...currentCats, gasto.categoria]
            }).eq('id', userId)
          }
        }
      }
    }

    if (!profile.gmail_first_sync_done) {
      await supabase.from('profiles').update({ gmail_first_sync_done: true }).eq('id', userId)
    }

    if (insertados > 0) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: '💳 Gastos importados',
          body: `Se importaron ${insertados} gasto${insertados > 1 ? 's' : ''} nuevo${insertados > 1 ? 's' : ''} desde tu banco`,
          url: '/gastos'
        })
      })
    }

    return NextResponse.json({ ok: true, gastos: gastos.length, insertados })

  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}