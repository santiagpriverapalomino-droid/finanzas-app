import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId, email, nombre } = await req.json()

    const now = new Date()
    const primerDiaMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
    const ultimoDiaMesAnterior = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
    const primerDiaMesActual = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

    const { data: gastosMesAnterior } = await supabase
      .from('expenses').select('*').eq('user_id', userId)
      .gte('date', primerDiaMesAnterior).lte('date', ultimoDiaMesAnterior)

    const { data: gastosMesActual } = await supabase
      .from('expenses').select('*').eq('user_id', userId)
      .gte('date', primerDiaMesActual)

    const { data: goals } = await supabase
      .from('goals').select('*').eq('user_id', userId)

    const { data: profile } = await supabase
      .from('profiles').select('monthly_income, salary_day').eq('id', userId).single()

    const totalAnterior = (gastosMesAnterior || []).reduce((s: number, e: any) => s + Number(e.amount), 0)
    const totalActual = (gastosMesActual || []).reduce((s: number, e: any) => s + Number(e.amount), 0)
    const income = profile?.monthly_income || 0
    const disponible = income - totalActual
    const diff = totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior * 100) : 0

    const porCategoria: Record<string, number> = {}
    ;(gastosMesActual || []).forEach((e: any) => {
      porCategoria[e.category] = (porCategoria[e.category] || 0) + Number(e.amount)
    })
    const topCategorias = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).slice(0, 3)

    const mesActualLabel = now.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
    const diffColor = diff > 0 ? '#b24f58' : '#16a34a'
    const diffTexto = diff > 0 ? `+${diff.toFixed(1)}% vs mes anterior` : `${diff.toFixed(1)}% vs mes anterior`
    const consejo = diff > 10
      ? `Gastaste ${diff.toFixed(1)}% más que el mes pasado. Revisa tus gastos en ${topCategorias[0]?.[0] || 'tus categorías principales'} para identificar dónde puedes optimizar.`
      : diff < -10
      ? `Excelente. Gastaste ${Math.abs(diff).toFixed(1)}% menos que el mes pasado. Considera mover ese ahorro a una de tus metas.`
      : 'Mantuviste un gasto similar al mes anterior. Revisa tus metas de ahorro y ve si puedes aportar un poco más este mes.'

    const metasHtml = (goals || []).length > 0 ? `
      <tr><td style="padding:0 0 20px;">
        <div style="background:#ffffff;border-radius:16px;border:1px solid #ebe6db;padding:24px;">
          <p style="margin:0 0 16px;font-size:11px;font-weight:bold;color:#9a9590;text-transform:uppercase;letter-spacing:0.05em;">Tus metas</p>
          ${(goals || []).map((g: any) => {
            const pct = Math.min(100, Math.round(g.saved_amount / g.target_amount * 100))
            return `
            <div style="margin-bottom:16px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                <span style="font-size:14px;color:#1f1f1f;font-weight:500;">🎯 ${g.name}</span>
                <span style="font-size:13px;font-weight:bold;color:#5a4bc3;">${pct}%</span>
              </div>
              <div style="background:#f0ebe0;border-radius:4px;height:6px;overflow:hidden;">
                <div style="background:#16a34a;height:6px;border-radius:4px;width:${pct}%;"></div>
              </div>
              <p style="margin:4px 0 0;font-size:12px;color:#9a9590;">S/${g.saved_amount.toLocaleString('es-PE')} de S/${g.target_amount.toLocaleString('es-PE')}</p>
            </div>`
          }).join('')}
        </div>
      </td></tr>` : ''

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu resumen Finti</title>
</head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee;padding:32px 0;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">

        <!-- Header morado -->
        <tr><td style="padding:0 0 20px;">
          <div style="background:#3d2f9f;border-radius:24px;padding:40px 32px;text-align:center;">
            <div style="width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:16px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
              <span style="font-size:28px;">📊</span>
            </div>
            <h1 style="margin:0;font-size:26px;font-weight:700;color:white;letter-spacing:-0.5px;">Tu resumen financiero</h1>
            <p style="margin:8px 0 0;font-size:15px;color:rgba(255,255,255,0.65);">${mesActualLabel} · Finti</p>
          </div>
        </td></tr>

        <!-- Saludo -->
        <tr><td style="padding:0 0 12px;">
          <div style="background:white;border-radius:16px;border:1px solid #ebe6db;padding:24px;">
            <p style="margin:0;font-size:16px;color:#1f1f1f;">Hola, <strong>${nombre}</strong> 👋</p>
            <p style="margin:8px 0 0;font-size:14px;color:#8c887d;line-height:1.6;">Aquí está tu resumen de gastos de este mes. Sigue registrando para mantener el control de tu plata.</p>
          </div>
        </td></tr>

        <!-- Cards gastado y disponible -->
        <tr><td style="padding:0 0 12px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="49%" style="padding-right:6px;">
                <div style="background:white;border-radius:16px;border:1px solid #ebe6db;padding:20px;">
                  <p style="margin:0;font-size:11px;color:#9a9590;text-transform:uppercase;font-weight:bold;letter-spacing:0.05em;">Gastado</p>
                  <p style="margin:6px 0 0;font-size:26px;font-weight:700;color:#b24f58;">S/${totalActual.toLocaleString('es-PE')}</p>
                  <p style="margin:4px 0 0;font-size:12px;font-weight:600;color:${diffColor};">${diffTexto}</p>
                </div>
              </td>
              <td width="49%" style="padding-left:6px;">
                <div style="background:white;border-radius:16px;border:1px solid #ebe6db;padding:20px;">
                  <p style="margin:0;font-size:11px;color:#9a9590;text-transform:uppercase;font-weight:bold;letter-spacing:0.05em;">Disponible</p>
                  <p style="margin:6px 0 0;font-size:26px;font-weight:700;color:#16a34a;">S/${disponible.toLocaleString('es-PE')}</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#9a9590;">de S/${income.toLocaleString('es-PE')}</p>
                </div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Top categorías -->
        ${topCategorias.length > 0 ? `
        <tr><td style="padding:0 0 12px;">
          <div style="background:white;border-radius:16px;border:1px solid #ebe6db;padding:24px;">
            <p style="margin:0 0 16px;font-size:11px;font-weight:bold;color:#9a9590;text-transform:uppercase;letter-spacing:0.05em;">Tus mayores gastos</p>
            ${topCategorias.map(([cat, amt], i) => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;${i < topCategorias.length - 1 ? 'border-bottom:1px solid #f0ebe0;' : ''}">
                <span style="font-size:14px;color:#403c37;">${cat}</span>
                <span style="font-size:14px;font-weight:700;color:#1f1f1f;">S/${Number(amt).toLocaleString('es-PE')}</span>
              </div>
            `).join('')}
          </div>
        </td></tr>` : ''}

        <!-- Metas -->
        ${metasHtml}

        <!-- Consejo Finti -->
        <tr><td style="padding:0 0 12px;">
          <div style="background:#edf7f2;border-radius:16px;border:1px solid #bbf7d0;padding:24px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#166534;">💬 Finti IA dice</p>
            <p style="margin:0;font-size:14px;color:#1f1f1f;line-height:1.7;">${consejo}</p>
          </div>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:0 0 32px;text-align:center;">
          <a href="https://usefinti.app" style="display:inline-block;background:#3d2f9f;color:white;padding:14px 36px;border-radius:14px;text-decoration:none;font-weight:700;font-size:15px;">Ver mi resumen completo →</a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="text-align:center;padding-bottom:32px;">
          <p style="margin:0;font-size:12px;color:#9a9590;line-height:2;">
            © 2026 Finti · Lima, Perú<br>
            <a href="https://usefinti.app/privacidad.html" style="color:#9a9590;text-decoration:none;">Privacidad</a> &nbsp;·&nbsp;
            <a href="https://usefinti.app/terminos.html" style="color:#9a9590;text-decoration:none;">Términos</a><br>
            <span style="font-size:11px;color:#c4bfb8;">Recibiste este email porque lo solicitaste desde Finti.</span>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

    await resend.emails.send({
      from: 'Finti <support@usefinti.app>',
      to: email,
      subject: `Tu resumen de ${mesActualLabel} 📊`,
      html,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Reporte error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}