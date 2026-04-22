import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const queries = [
      'inversiones+peru',
      'bolsa+valores+lima',
      'fondos+mutuos+peru',
      'bitcoin+finanzas',
    ]

    const allNoticias: any[] = []

    for (const q of queries) {
      const res = await fetch(
        `https://news.google.com/rss/search?q=${q}&hl=es-419&gl=PE&ceid=PE:es-419`,
        { cache: 'no-store' }
      )
      const text = await res.text()

      // Parsear XML manualmente
      const items = text.match(/<item>([\s\S]*?)<\/item>/g) || []
      items.slice(0, 2).forEach(item => {
        const titulo = item.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/\s*-\s*[^-]+$/, '').trim()
        const url = item.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim()
        const fuente = item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim()
        const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim()

        if (titulo && url) {
          const fecha = pubDate ? new Date(pubDate) : new Date()
          const ahora = new Date()
          const diffHoras = Math.round((ahora.getTime() - fecha.getTime()) / (1000 * 60 * 60))
          const tiempo = diffHoras < 1 ? 'Hace menos de 1h'
            : diffHoras < 24 ? `Hace ${diffHoras}h`
            : `Hace ${Math.round(diffHoras/24)} días`

          allNoticias.push({
            fuente: fuente || 'Google News',
            titulo,
            url,
            tiempo,
          })
        }
      })
    }

    // Eliminar duplicados por título
    const unicas = allNoticias.filter((n, i, arr) =>
      arr.findIndex(x => x.titulo === n.titulo) === i
    )

    return NextResponse.json({ ok: true, data: unicas.slice(0, 6) })
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}