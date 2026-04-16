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

    // Detectar tipo real de imagen por magic bytes
    const uint8 = new Uint8Array(bytes)
    let mediaType = file.type

    if (uint8[0] === 0xFF && uint8[1] === 0xD8) {
      mediaType = 'image/jpeg'
    } else if (uint8[0] === 0x89 && uint8[1] === 0x50) {
      mediaType = 'image/png'
    } else if (uint8[0] === 0x25 && uint8[1] === 0x50) {
      mediaType = 'application/pdf'
    }

    const isPdf = mediaType === 'application/pdf'

    const contentBlock = isPdf ? {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64 }
    } : {
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data: base64 }
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              contentBlock,
              {
                type: 'text',
                text: `Analiza este estado de cuenta bancario peruano y extrae SOLO los cargos/débitos (gastos), no los abonos/depósitos.

Para cada gasto encontrado, responde ÚNICAMENTE con un JSON array, sin texto adicional, sin markdown:
[
  {
    "descripcion": "nombre limpio del comercio o concepto",
    "monto": 123.45,
    "fecha": "2025-11-07",
    "categoria": "Alimentación|Transporte|Entretenimiento|Compras|Otros"
  }
]

Reglas:
- fecha en formato YYYY-MM-DD
- monto como número positivo sin símbolo de moneda
- categoria debe ser exactamente una de: Alimentación, Transporte, Entretenimiento, Compras, Otros
- descripcion debe ser legible, no código del banco
- ignora: mantenimiento de cuenta, transferencias entre cuentas propias, saldos anteriores
- si no encuentras gastos responde: []`
              }
            ]
          }
        ]
      })
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Claude error:', err)
      return NextResponse.json({ gastos: [], debug: err })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || '[]'
    console.log('Claude respuesta:', text)

    const clean = text.replace(/```json|```/g, '').trim()
    const gastos = JSON.parse(clean)

    return NextResponse.json({ gastos })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ gastos: [], error: String(error) })
  }
}
