import { NextResponse } from 'next/server'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// Cache en memoria
let cache: { data: any[], timestamp: number } | null = null
const CACHE_DURATION = 60 * 60 * 1000 // 1 hora

const SIMBOLOS_DEFAULT = [
  { symbol: 'SPY', nombre: 'S&P 500', sub: 'ETF · USD' },
  { symbol: 'BTC', nombre: 'Bitcoin', sub: 'Cripto · USD', cripto: true },
  { symbol: 'GLD', nombre: 'Oro', sub: 'ETF · USD' },
  { symbol: 'USD', nombre: 'USD/PEN', sub: 'Tipo de cambio', fx: true },
]

async function getCotizacion(s: any) {
  try {
    let precio = 0
    let cambio = 0

    if (s.fx) {
      const res = await fetch(`https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=PEN&apikey=${process.env.ALPHA_VANTAGE_KEY}`)
      const data = await res.json()
      const rate = data['Realtime Currency Exchange Rate']
      precio = parseFloat(rate?.['5. Exchange Rate'] || '0')
    } else if (s.cripto) {
      const res = await fetch(`https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=BTC&to_currency=USD&apikey=${process.env.ALPHA_VANTAGE_KEY}`)
      const data = await res.json()
      const rate = data['Realtime Currency Exchange Rate']
      precio = parseFloat(rate?.['5. Exchange Rate'] || '0')
    } else {
      const res = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${s.symbol}&apikey=${process.env.ALPHA_VANTAGE_KEY}`)
      const data = await res.json()
      const quote = data['Global Quote']
      precio = parseFloat(quote?.['05. price'] || '0')
      cambio = parseFloat(quote?.['10. change percent']?.replace('%', '') || '0')
    }

    const prefijo = s.fx ? 'S/' : '$'
    return {
      symbol: s.symbol,
      nombre: s.nombre,
      sub: s.sub,
      precio: precio > 0 ? `${prefijo}${precio.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 'N/D',
      cambio: `${cambio >= 0 ? '+' : ''}${cambio.toFixed(2)}%`,
      positivo: cambio >= 0,
    }
  } catch {
    return { symbol: s.symbol, nombre: s.nombre, sub: s.sub, precio: 'N/D', cambio: '0%', positivo: true }
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const simbolosParam = searchParams.get('symbols')
  const simbolos = simbolosParam ? JSON.parse(simbolosParam) : SIMBOLOS_DEFAULT

  // Usar cache si es reciente y no hay símbolos personalizados
  if (!simbolosParam && cache && Date.now() - cache.timestamp < CACHE_DURATION) {
    return NextResponse.json({ ok: true, data: cache.data, cached: true })
  }

  const resultados = []
  for (const s of simbolos) {
    const cot = await getCotizacion(s)
    resultados.push(cot)
    await sleep(1200) // 1.2 segundos entre requests
  }

  // Guardar en cache
  if (!simbolosParam) {
    cache = { data: resultados, timestamp: Date.now() }
  }

  return NextResponse.json({ ok: true, data: resultados })
}