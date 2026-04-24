import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function refreshToken(refreshToken: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  return data.access_token
}

export async function POST(req: Request) {
  try {
    const { userId } = await req.json()

    const { data: profile } = await supabase
      .from('profiles')
      .select('gmail_access_token, gmail_refresh_token, gmail_connected')
      .eq('id', userId)
      .single()

    if (!profile?.gmail_connected) {
      return NextResponse.json({ ok: false, error: 'Gmail no conectado' })
    }

    // Refrescar token
    let accessToken = profile.gmail_access_token
    if (profile.gmail_refresh_token) {
      accessToken = await refreshToken(profile.gmail_refresh_token)
      await supabase.from('profiles').update({ gmail_access_token: accessToken }).eq('id', userId)
    }

    // Buscar emails de bancos peruanos
    const query = encodeURIComponent('from:(bcp.com.pe OR interbank.pe OR bbva.pe OR scotiabank.com.pe OR yape OR plin) subject:(compra OR pago OR cargo OR transacción)')
    const gmailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=20`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const gmailData = await gmailRes.json()

    if (!gmailData.messages || gmailData.messages.length === 0) {
      return NextResponse.json({ ok: true, gastos: [], msg: 'No se encontraron emails de bancos' })
    }

    const gastos = []

    for (const msg of gmailData.messages.slice(0, 10)) {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const msgData = await msgRes.json()

      // Extraer texto del email
      let body = ''
      const parts = msgData.payload?.parts || [msgData.payload]
      for (const part of parts) {
        if (part?.body?.data) {
          body += Buffer.from(part.body.data, 'base64').toString('utf-8')
        }
      }

      const subject = msgData.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || ''
      const date = msgData.payload?.headers?.find((h: any) => h.name === 'Date')?.value || ''

      // Usar IA para extraer el gasto
      const prompt = `Analiza este email de un banco peruano y extrae la información del gasto.
      
Asunto: ${subject}
Fecha: ${date}
Contenido: ${body.slice(0, 1000)}

Responde SOLO con un JSON con este formato exacto (sin texto adicional):
{
  "es_gasto": true/false,
  "monto": 0.00,
  "moneda": "PEN" o "USD",
  "descripcion": "nombre del comercio o descripción",
  "categoria": "comida" | "transporte" | "entretenimiento" | "salud" | "educacion" | "ropa" | "servicios" | "otro",
  "fecha": "YYYY-MM-DD"
}

Si no es un gasto o no puedes extraer la información, pon es_gasto: false.`

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      })

      try {
        const text = response.content[0].type === 'text' ? response.content[0].text : ''
        const gasto = JSON.parse(text.trim())
        
        if (gasto.es_gasto && gasto.monto > 0) {
          gastos.push(gasto)
        }
      } catch {
        // Email no procesable
      }
    }

    // Insertar gastos en Supabase (evitar duplicados por fecha y monto)
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

    return NextResponse.json({ ok: true, gastos: gastos.length, insertados })
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}