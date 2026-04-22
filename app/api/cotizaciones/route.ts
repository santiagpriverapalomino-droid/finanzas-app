import { NextResponse } from 'next/server'
import yahooFinance from 'yahoo-finance2'

const SIMBOLOS_DEFAULT = [
  { symbol: 'SPY', nombre: 'S&P 500', sub: 'ETF · USD' },
  { symbol: 'BTC-USD', nombre: 'Bitcoin', sub: 'Cripto · USD' },
  { symbol: 'GC=F', nombre: 'Oro', sub: 'Commodity · USD' },
  { symbol: 'PEN=X', nombre: 'USD/PEN', sub: 'Tipo de cambio' },
]

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const simbolosParam = searchParams.get('symbols')
  
  const simbolos = simbolosParam 
    ? JSON.parse(simbolosParam) 
    : SIMBOLOS_DEFAULT

  try {
    const resultados = await Promise.all(
      simbolos.map(async (s: any) => {
        try {
          const quote = await yahooFinance.quote(s.symbol)
console.log(s.symbol, JSON.stringify(quote).slice(0, 200))
          const cambio = (quote as any).regularMarketChangePercent || 0
const precio = (quote as any).regularMarketPrice || (quote as any).postMarketPrice || (quote as any).preMarketPrice || 0
const moneda = (quote as any).currency || 'USD'
          const prefijo = moneda === 'USD' ? '$' : moneda === 'PEN' ? 'S/' : ''
          return {
            symbol: s.symbol,
            nombre: s.nombre,
            sub: s.sub,
            precio: `${prefijo}${precio.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
            cambio: `${cambio >= 0 ? '+' : ''}${cambio.toFixed(2)}%`,
            positivo: cambio >= 0,
          }
        } catch {
          return { symbol: s.symbol, nombre: s.nombre, sub: s.sub, precio: 'N/D', cambio: '0%', positivo: true }
        }
      })
    )
    return NextResponse.json({ ok: true, data: resultados })
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}