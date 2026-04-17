import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Sin API key' }, { status: 500 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'Sin archivo' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const uint8 = new Uint8Array(bytes)

    let mediaType = file.type
    if (uint8[0] === 0xFF && uint8[1] === 0xD8) mediaType = 'image/jpeg'
    else if (uint8[0] === 0x89 && uint8[1] === 0x50) mediaType = 'image/png'
    else if (uint8[0] === 0x47 && uint8[1] === 0x49) mediaType = 'image/gif'
    else if (uint8[0] === 0x52 && uint8[1] === 0x49) mediaType = 'image/webp'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 }
            },
            {
              type: 'text',
              text: `Analiza esta boleta, ticket o recibo y extrae el gasto principal.
Responde ÚNICAMENTE con un JSON object, sin texto adicional:
{
  "descripcion": "nombre del negocio o concepto claro",
  "monto": 25.50,
  "categoria": "Alimentación|Transporte|Entretenimiento|Compras|Otros"
}
Reglas:
- monto como número positivo, el total a pagar
- categoria debe ser exactamente una de: Alimentación, Transporte, Entretenimiento, Compras, Otros
- descripcion debe ser el nombre del negocio o una descripción clara
- si no puedes leer la boleta responde: null`
            }
          ]
        }]
      })
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Claude error:', err)
      return NextResponse.json({ gasto: null })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || 'null'
    const clean = text.replace(/```json|```/g, '').trim()
    if (clean === 'null') return NextResponse.json({ gasto: null })
    const gasto = JSON.parse(clean)
    return NextResponse.json({ gasto })
  } catch (error) {
    console.error('Scan error:', error)
    return NextResponse.json({ gasto: null })
  }
}