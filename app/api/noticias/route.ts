import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch(
      `https://gnews.io/api/v4/search?q=inversiones+finanzas+bolsa+bitcoin&lang=es&country=pe&max=6&apikey=${process.env.GNEWS_API_KEY}`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()

    if (!data.articles) {
      return NextResponse.json({ ok: false, error: 'Sin artículos' }, { status: 500 })
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