import { NextRequest, NextResponse } from 'next/server'

async function llamarClaude(
  apiKey: string,
  pregunta: string,
  resumenGastos: string,
  contextoUsuario: string,
  historial: {role: string, content: string}[],
  nombreUsuario: string,
  intentos = 3
): Promise<string> {
  for (let i = 0; i < intentos; i++) {
    try {
      const msgUsuario = [
        contextoUsuario ? `Contexto del usuario:\n${contextoUsuario}` : null,
        resumenGastos ? `Gastos de este mes:\n${resumenGastos}` : null,
        `Pregunta: ${pregunta}`
      ].filter(Boolean).join('\n\n')

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 800,
          system: `Eres el asesor financiero personal de ${nombreUsuario}, un joven peruano que está comenzando su vida financiera. Tienes acceso completo a su situación financiera real dentro de Finti.

TU PERSONALIDAD:
Hablas como un amigo mayor que sabe mucho de finanzas, no como un banco. Usas lenguaje natural peruano — puedes decir "plata", "billete", "está complicado", "ojo con eso". Nunca eres condescendiente. Nunca das sermones. Vas directo al punto. Cuando el usuario comete un error financiero no lo regañas, le explicas el impacto real en números concretos y le das una alternativa accionable.

REGLAS CRÍTICAS:
1. NUNCA des respuestas genéricas. Cada respuesta debe referenciar datos reales del usuario. Si no tienes un dato, pregunta antes de responder.
2. SIEMPRE habla en soles peruanos como moneda principal, dólares como secundaria.
3. Conoces el ecosistema financiero peruano: BCP, Interbank, BBVA, Scotiabank, Yape, Plin, fondos mutuos de Credicorp e Interfondos, AFP Habitat/Prima/Integra/Profuturo, Cavali, BVL.
4. Cuando recomiendes un producto financiero peruano específico menciona rangos de rentabilidad reales y realistas, nunca prometas rendimientos.
5. Si el usuario pregunta algo fuera de finanzas, redirige amablemente: "Eso está fuera de lo mío, pero en lo que es tu plata te puedo ayudar con..."
6. Detecta patrones preocupantes proactivamente. Si el usuario gasta más del 30% en entretenimiento o no está avanzando hacia sus metas, mencionalo con tacto y con números.

CAPACIDADES ESPECÍFICAS:
- Analizar si el usuario está en camino a sus metas o no, y cuánto le falta
- Sugerir cómo redistribuir gastos para ahorrar más sin sacrificar calidad de vida
- Explicar productos de inversión peruanos en lenguaje simple
- Alertar sobre gastos inusuales comparando con meses anteriores
- Calcular en tiempo real cuánto necesita ahorrar por mes para llegar a cada meta
- Dar contexto de noticias financieras relevantes para su portafolio específico

FORMATO DE RESPUESTAS:
- Máximo 4 párrafos cortos en conversación normal
- Usa números concretos siempre que puedas
- Si la respuesta requiere una lista, máximo 4 items
- Termina con una pregunta o acción concreta cuando sea relevante, no siempre
- NUNCA uses markdown, símbolos, en texto plano sin markdown, sin asteriscos, sin guiones como viñetas, sin listas con guiones, sin comas de oxford, # ni emojis excesivos — esto es una conversación, no un documento
- Responde SIEMPRE en texto plano con párrafos separados por saltos de línea

EJEMPLO DE LO QUE NO DEBES HACER:
Usuario: "¿Debería invertir en fondos mutuos?"
Respuesta mala: "Los fondos mutuos son instrumentos de inversión colectiva que pueden ser una buena opción dependiendo de tu perfil de riesgo..."

EJEMPLO DE LO QUE SÍ DEBES HACER:
Usuario: "¿Debería invertir en fondos mutuos?"
Respuesta buena: "Con tu saldo disponible de S/380 este mes y tu meta del viaje a Cusco en 8 meses, yo metería S/200 en un fondo mutuo conservador de Credicorp que rinde entre 4-6% anual. No es mucho pero es mejor que tenerlo quieto en el banco. ¿Quieres que te explique cómo abrirlo?"`,
          messages: [
            ...historial,
            { role: 'user', content: msgUsuario }
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
  const { pregunta, resumenGastos, contextoUsuario, historial, nombreUsuario } = await req.json()
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey || apiKey === 'tu_api_key_aqui') {
    return NextResponse.json({ respuesta: getRespuestaPredefinida(pregunta) })
  }

  const respuesta = await llamarClaude(
    apiKey,
    pregunta,
    resumenGastos || '',
    contextoUsuario || '',
    historial || [],
    nombreUsuario || 'amigo'
  )
  return NextResponse.json({ respuesta })
}

// API para revisión semanal automática
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo')
  const gastosSemana = searchParams.get('gastosSemana')
  const gastosSemanaAnterior = searchParams.get('gastosSemanaAnterior')
  const ingreso = searchParams.get('ingreso')
  const nombre = searchParams.get('nombre')
  const metas = searchParams.get('metas')

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ respuesta: '' })

  let prompt = ''

  if (tipo === 'semanal') {
    prompt = `Genera una revisión semanal corta y directa para ${nombre}.

Gastos esta semana: S/${gastosSemana}
Gastos semana anterior: S/${gastosSemanaAnterior}
Ingreso mensual: S/${ingreso}
Metas activas: ${metas}

Escribe en texto plano sin markdown. Máximo 3 párrafos cortos. Sé directo y usa números concretos. Incluye si va bien o mal vs la semana anterior y un consejo accionable para esta semana. Habla como un amigo, no como un banco.`
  } else if (tipo === 'mensual') {
    prompt = `Genera un resumen mensual conversacional para ${nombre}.

Total gastado este mes: S/${gastosSemana}
Ingreso mensual: S/${ingreso}
Metas activas: ${metas}

Escribe en texto plano sin markdown. Máximo 4 párrafos. Resalta lo bueno y lo malo con números concretos. Da 2 consejos específicos para el próximo mes. Habla como un amigo, no como un banco.`
  }

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
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    const data = await response.json()
    return NextResponse.json({ respuesta: data.content?.[0]?.text || '' })
  } catch {
    return NextResponse.json({ respuesta: '' })
  }
}

function getRespuestaPredefinida(pregunta: string): string {
  const q = pregunta.toLowerCase()
  if (q.includes('ahorrar') || q.includes('ahorro')) return 'Para ahorrar más, separa el 20% de tu sueldo apenas cobres, antes de gastar en cualquier otra cosa. Abre una cuenta de ahorros separada y no la toques. Empieza con lo que puedas, aunque sea S/50.'
  if (q.includes('invertir') || q.includes('inversión')) return 'Para empezar a invertir en Perú, lo más accesible son los fondos mutuos desde S/100 en Credicorp, BBVA o Interbank. Primero ten un fondo de emergencia de 3 meses de gastos antes de invertir.'
  if (q.includes('afp') || q.includes('onp')) return 'La AFP es una cuenta individual donde tú eliges cómo se invierte tu fondo de jubilación. La ONP es el sistema estatal. Si eres joven, la AFP suele ser mejor opción por la rentabilidad a largo plazo.'
  if (q.includes('deuda') || q.includes('crédito')) return 'Para salir de deudas usa el método bola de nieve: paga mínimos en todas y destina todo el dinero extra a la deuda más pequeña. Al eliminarla, suma ese pago a la siguiente.'
  if (q.includes('bolsa') || q.includes('acciones')) return 'La bolsa de valores te permite comprar acciones de empresas y ganar si suben de precio. En Perú puedes operar en la BVL a través de una SAB. Para empezar, considera ETFs globales como el SPY que replican el S&P 500.'
  if (q.includes('cts')) return 'La CTS es un beneficio que te da tu empleador dos veces al año (mayo y noviembre). Es equivalente a medio sueldo cada vez. Úsala como fondo de emergencia.'
  if (q.includes('presupuesto')) return 'Un buen presupuesto sigue la regla 50/30/20: 50% para necesidades, 30% para gustos y 20% para ahorro. Anota todo lo que gastas por un mes para tener claridad.'
  return 'Estoy aquí para ayudarte con cualquier pregunta sobre finanzas personales. Puedes preguntarme sobre ahorro, inversiones, deudas, presupuesto, AFP, CTS, bolsa de valores o tus gastos personales.'
}