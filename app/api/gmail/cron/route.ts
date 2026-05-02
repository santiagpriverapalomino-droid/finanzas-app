
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

function extraerGastoRapido(subject: string, body: string, dateStr: string): any | null {
  const texto = (subject + ' ' + body).toLowerCase()
  
  // Filtrar devoluciones
  if (texto.includes('devoluci') || texto.includes('reembolso') || 
      texto.includes('reversa') || texto.includes('anulaci')) return null

  // Extraer monto
  const montoMatch = body.match(/S\/\s*([\d,]+\.?\d*)/i) || subject.match(/S\/\s*([\d,]+\.?\d*)/i)
  const montoUSDMatch = body.match(/USD\s*([\d,]+\.?\d*)/i)
  if (!montoMatch && !montoUSDMatch) return null

  const moneda = montoUSDMatch ? 'USD' : 'PEN'
  const montoRaw = montoUSDMatch ? montoUSDMatch[1] : montoMatch![1]
  const monto = parseFloat(montoRaw.replace(',', ''))
  if (!monto || monto <= 0) return null

  // Extraer comercio
  let descripcion = 'Gasto banco'
  const comercioMatch =
    subject.match(/en\s+([A-Z][A-Z\s\*\.\-]+?)(?:\.|$)/i) ||
    body.match(/en\s+([A-Z][A-Z\s\*\.\-]{3,40}?)(?:\s+por|\s+el|\s+fecha|\.)/i)
  if (comercioMatch) descripcion = comercioMatch[1].trim()

  // Fecha
  let fecha = new Date().toISOString().split('T')[0]
  try {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      fecha = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    }
  } catch {}

  // Categoría
  const desc = descripcion.toLowerCase()
  let categoria = 'Compras'
  if (desc.includes('rappi') || desc.includes('uber eats') || desc.includes('delivery') || desc.includes('kfc') || desc.includes('mcdonalds')) categoria = 'Alimentación'
  else if (desc.includes('uber') || desc.includes('cabify') || desc.includes('rides') || desc.includes('taxi') || desc.includes('indriver')) categoria = 'Transporte'
  else if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('disney') || desc.includes('hbo')) categoria = 'Entretenimiento'
  else if (desc.includes('farmacia') || desc.includes('inkafarma') || desc.includes('clinica') || desc.includes('smart fit')) categoria = 'Salud'

  return { monto, moneda, descripcion, categoria, fecha }
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, gmail_access_token, gmail_refresh_token, gmail_connected')
    .eq('gmail_connected', true)

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ ok: true, msg: 'Sin usuarios con Gmail' })
  }

  let totalInsertados = 0

  for (const profile of profiles) {
    try {
      let accessToken = profile.gmail_access_token
      if (profile.gmail_refresh_token) {
        accessToken = await refreshToken(profile.gmail_refresh_token)
        await supabase.from('profiles').update({ gmail_access_token: accessToken }).eq('id', profile.id)
      }

      // Solo últimas 2 horas
      const hace2h = new Date(Date.now() - 2 * 60 * 60 * 1000)
      const afterDate = `${hace2h.getFullYear()}/${String(hace2h.getMonth()+1).padStart(2,'0')}/${String(hace2h.getDate()).padStart(2,'0')}`
      const query = encodeURIComponent(`from:(notificacionesbcp.com.pe OR yape) after:${afterDate}`)

      const gmailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=5`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const gmailData = await gmailRes.json()

      if (!gmailData.messages || gmailData.messages.length === 0) continue

      for (const msg of gmailData.messages) {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
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

        const gasto = extraerGastoRapido(subject, body, date)
        if (!gasto) continue

        const { data: existing } = await supabase
        .from('expenses')
        .select('id')
        .eq('user_id', profile.id)
        .eq('gmail_message_id', msg.id)
        .single()

      if (!existing) {
        await supabase.from('expenses').insert({
          user_id: profile.id,
          amount: gasto.monto,
          currency: gasto.moneda,
          description: gasto.descripcion,
          category: gasto.categoria,
          date: gasto.fecha,
          source: 'gmail',
          gmail_message_id: msg.id,
        })
          totalInsertados++

          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: profile.id,
              title: '💳 Nuevo gasto detectado',
              body: `${gasto.descripcion} — ${gasto.moneda === 'USD' ? '$' : 'S/'}${gasto.monto}`,
              url: '/gastos'
            })
          }).catch(() => {})
        }
      }
    } catch {
      continue
    }
  }

  return NextResponse.json({ ok: true, insertados: totalInsertados })
}