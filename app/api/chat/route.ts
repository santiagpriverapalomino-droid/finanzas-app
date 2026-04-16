import { NextRequest, NextResponse } from 'next/server'

async function llamarClaude(apiKey: string, pregunta: string, resumenGastos: string, intentos = 3): Promise<string> {
  for (let i = 0; i < intentos; i++) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          system: `Eres Finti, un asesor financiero personal para jóvenes peruanos de 18-30 años.
Eres amigable, directo y conoces el contexto financiero peruano (AFP, CTS, ONP, soles, fondos mutuos, BCP, BBVA, Interbank, Credicorp, bolsa de valores, etc).
Responde SIEMPRE en texto plano sin markdown, sin asteriscos, sin símbolos #, sin guiones como viñetas.
Usa párrafos cortos separados por saltos de línea. Máximo 4 párrafos.
Si el usuario tiene gastos registrados úsalos para personalizar tu respuesta.
Puedes responder cualquier pregunta sobre finanzas personales, ahorro, inversiones, deudas, presupuesto, economía peruana y los gastos del usuario.
Nunca garantices rendimientos de inversión.`,
          messages: [
            {
              role: 'user',
              content: resumenGastos
                ? `Mis gastos de este mes:\n${resumenGastos}\n\nPregunta: ${pregunta}`
                : pregunta
            }
          ]
        })
      })

      if (response.status === 529 || response.status === 503) {
        if (i < intentos - 1) {
          await new Promise(r => setTimeout(r, 1500 * (i + 1)))
          continue
        }
      }

      if (!response.ok) {
        const err = await response.text()
        console.error('Anthropic error:', err)
        if (i < intentos - 1) {
          await new Promise(r => setTimeout(r, 1000))
          continue
        }
        return getRespuestaPredefinida(pregunta)
      }

      const data = await response.json()

      if (data.error?.type === 'overloaded_error') {
        if (i < intentos - 1) {
          await new Promise(r => setTimeout(r, 2000 * (i + 1)))
          continue
        }
        return getRespuestaPredefinida(pregunta)
      }

      return data.content?.[0]?.text || getRespuestaPredefinida(pregunta)

    } catch (error) {
      console.error('Error intento', i + 1, error)
      if (i < intentos - 1) {
        await new Promise(r => setTimeout(r, 1000))
        continue
      }
    }
  }
  return getRespuestaPredefinida(pregunta)
}

export async function POST(req: NextRequest) {
  const { pregunta, resumenGastos } = await req.json()
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey || apiKey === 'tu_api_key_aqui') {
    return NextResponse.json({ respuesta: getRespuestaPredefinida(pregunta) })
  }

  const respuesta = await llamarClaude(apiKey, pregunta, resumenGastos || '')
  return NextResponse.json({ respuesta })
}

function getRespuestaPredefinida(pregunta: string): string {
  const q = pregunta.toLowerCase()
  if (q.includes('ahorrar') || q.includes('ahorro')) return 'Para ahorrar más, separa el 20% de tu sueldo apenas cobres, antes de gastar en cualquier otra cosa. Abre una cuenta de ahorros separada y no la toques. Empieza con lo que puedas, aunque sea S/50.'
  if (q.includes('invertir') || q.includes('inversión')) return 'Para empezar a invertir en Perú, lo más accesible son los fondos mutuos desde S/100 en Credicorp, BBVA o Interbank. Primero ten un fondo de emergencia de 3 meses de gastos antes de invertir.'
  if (q.includes('afp') || q.includes('onp')) return 'La AFP es una cuenta individual donde tú eliges cómo se invierte tu fondo de jubilación. La ONP es el sistema estatal. Si eres joven, la AFP suele ser mejor opción por la rentabilidad a largo plazo.'
  if (q.includes('deuda') || q.includes('crédito')) return 'Para salir de deudas usa el método bola de nieve: paga mínimos en todas y destina todo el dinero extra a la deuda más pequeña. Al eliminarla, suma ese pago a la siguiente.'
  if (q.includes('bolsa') || q.includes('acciones')) return 'La bolsa de valores te permite comprar acciones de empresas y ganar si suben de precio. En Perú puedes operar en la BVL a través de una SAB (Sociedad Agente de Bolsa). Para empezar, considera ETFs globales como el SPY que replican el S&P 500.'
  if (q.includes('cts')) return 'La CTS es un beneficio que te da tu empleador dos veces al año (mayo y noviembre). Es equivalente a medio sueldo cada vez. Puedes retirar hasta el 100% si tu empleador lo deposita. Úsala como fondo de emergencia.'
  if (q.includes('presupuesto')) return 'Un buen presupuesto sigue la regla 50/30/20: 50% para necesidades (alquiler, comida, transporte), 30% para gustos y 20% para ahorro. Anota todo lo que gastas por un mes para tener claridad.'
  return 'Estoy aquí para ayudarte con cualquier pregunta sobre finanzas personales. Puedes preguntarme sobre ahorro, inversiones, deudas, presupuesto, AFP, CTS, bolsa de valores o tus gastos personales.'
}
