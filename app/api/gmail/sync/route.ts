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

function extraerGastoBCP(subject: string, body: string, dateStr: string): any | null {
  // Filtrar devoluciones y reembolsos
  const textoCompleto = (subject + ' ' + body).toLowerCase()
  if (textoCompleto.includes('devoluci') || textoCompleto.includes('reembolso') || 
      textoCompleto.includes('reversa') || textoCompleto.includes('anulaci')) {
    return null
  }

  // Extraer monto — busca patrones como "S/ 50.19" o "S/50.19" o "USD 20.00"
  const montoMatch = body.match(/S\/\s*([\d,]+\.?\d*)/i) || subject.match(/S\/\s*([\d,]+\.?\d*)/i)
  const montoUSDMatch = body.match(/USD\s*([\d,]+\.?\d*)/i)
  
  if (!montoMatch && !montoUSDMatch) return null
  
  const moneda = montoUSDMatch ? 'USD' : 'PEN'
  const montoRaw = montoUSDMatch ? montoUSDMatch[1] : montoMatch![1]
  const monto = parseFloat(montoRaw.replace(',', ''))
  
  if (!monto || monto <= 0) return null

  // Extraer comercio — busca después de "en " o "comercio:" en el subject o body
  let descripcion = 'Gasto BCP'
  const comercioMatch = 
    subject.match(/en\s+([A-Z][A-Z\s\*\.\-]+?)(?:\.|$)/i) ||
    body.match(/en\s+([A-Z][A-Z\s\*\.\-]{3,40}?)(?:\s+por|\s+el|\s+fecha|\.)/i) ||
    body.match(/Comercio[:\s]+([^\n\r]{3,40})/i)
  
  if (comercioMatch) {
    descripcion = comercioMatch[1].trim()
  }

  // Extraer fecha del header Date
  let fecha = new Date().toISOString().split('T')[0]
  try {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      fecha = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    }
  } catch {}

  // Categoría básica por comercio
  const desc = descripcion.toLowerCase()
  let categoria = 'Compras'
  if (desc.includes('rappi') || desc.includes('uber eats') || desc.includes('delivery') || desc.includes('kfc') || desc.includes('mcdonalds') || desc.includes('bembos')) categoria = 'Alimentación'
  else if (desc.includes('uber') || desc.includes('cabify') || desc.includes('indriver') || desc.includes('rides') || desc.includes('taxi')) categoria = 'Transporte'
  else if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('disney') || desc.includes('hbo') || desc.includes('youtube')) categoria = 'Entretenimiento'
  else if (desc.includes('farmacia') || desc.includes('inkafarma') || desc.includes('mifarma') || desc.includes('clinica') || desc.includes('doctor')) categoria = 'Salud'
  else if (desc.includes('smart fit') || desc.includes('gimnasio') || desc.includes('gym')) categoria = 'Salud y Fitness'

  return { es_gasto: true, monto, moneda, descripcion, categoria, fecha }
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
    const maxEmails = isFirstSync ? 20 : 5
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
        if (part?.body?.data) rawBody += Buffer.from(part.body.data, 'base64').toString('utf-8')
        if (part?.parts) {
          for (const subpart of part.parts) {
            if (subpart?.body?.data) rawBody += Buffer.from(subpart.body.data, 'base64').toString('utf-8')
          }
        }
      }

      const body = stripHtml(rawBody).slice(0, 1000)
      const subject = msgData.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || ''
      const date = msgData.payload?.headers?.find((h: any) => h.name === 'Date')?.value || ''

      const gasto = extraerGastoBCP(subject, body, date)
      if (gasto) gastos.push(gasto)
    }

    let insertados = 0
    const FIXED = ['Alimentación', 'Transporte', 'Entretenimiento', 'Compras', 'Servicios']

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

    if (isFirstSync) {
      await supabase.from('profiles').update({ gmail_first_sync_done: true }).eq('id', userId)
    }

    if (insertados > 0) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: '💳 Nuevo gasto detectado',
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