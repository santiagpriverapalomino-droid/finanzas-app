import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=inversiones+finanzas+peru+bolsa+bitcoin+ETF&language=es&sortBy=publishedAt&pageSize=6&apiKey=${process.env.NEWS_API_KEY}`,
      { next: { revalidate: 3600 } } // cache 1 hora
    )
    const data = await res.json()

    if (data.status !== 'ok') {
      return NextResponse.json({ ok: false, error: data.message }, { status: 500 })
    }

    const noticias = data.articles.map((a: any) => ({
      fuente: a.source.name,
      titulo: a.title,
      url: a.url,
      tiempo: new Date(a.publishedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    }))

    return NextResponse.json({ ok: true, data: noticias })
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}