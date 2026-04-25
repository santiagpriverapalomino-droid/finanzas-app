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

    const isFirstSync = !profile.gmail_first_sync_done
const maxEmails = isFirstSync ? 100 : 10
const query = encodeURIComponent('from:notificacionesbcp.com.pe')

    const gmailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=${maxEmails}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const gmailData = await gmailRes.json()

    if (!gmailData.messages || gmailData.messages.length === 0) {
      return NextResponse.json({ ok: true, gastos: [], insertados: 0, msg: 'No se encontraron emails' })
    }

    const gastos: any[] = []

    for (const msg of gmailData.messages.slice(0, maxEmails)) {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const msgData = await msgRes.json()

      let rawBody = ''
      const parts = msgData.payload?.parts || [msgData.payload]
      for (const part of parts) {
        if (part?.body?.data) {
          rawBody += Buffer.from(part.body.data, 'base64').toString('utf-8')
        }
        // partes anidadas
        if (part?.parts) {
          for (const subpart of part.parts) {
            if (subpart?.body?.data) {
              rawBody += Buffer.from(subpart.body.data, 'base64').toString('utf-8')
            }
          }
        }
      }

      const body = stripHtml(rawBody).slice(0, 800)
      const subject = msgData.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || ''
      const date = msgData.payload?.headers?.find((h: any) => h.name === 'Date')?.value || ''
      const prompt = `Eres un extractor de gastos bancarios peruanos. Analiza este email del BCP.

Asunto: ${subject}
Fecha: ${date}
Contenido: ${body}

Extrae el gasto y responde SOLO con JSON, sin texto adicional:
{
  "es_gasto": true,
  "monto": 50.19,
  "moneda": "PEN",
  "descripcion": "RAPPI PERU",
  "categoria": "Alimentación",
  "fecha": "2024-04-23"
}

Si no hay monto claro, responde: {"es_gasto": false}`

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      })

      try {
        const text = response.content[0].type === 'text' ? response.content[0].text : ''
const clean = text.replace(/```json|```/g, '').trim()
const gasto = JSON.parse(clean)
        if (gasto.es_gasto && gasto.monto > 0) {
          gastos.push(gasto)
        }
      } catch {
        // no procesable
      }
    }

    let insertados = 0
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
      }
    }
if (isFirstSync) {
  await supabase.from('profiles').update({ gmail_first_sync_done: true }).eq('id', userId)
}
    return NextResponse.json({ ok: true, gastos: gastos.length, insertados })
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}