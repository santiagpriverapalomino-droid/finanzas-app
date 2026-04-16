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

    // Obtener gastos del mes anterior
    const now = new Date()
    const primerDiaMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
    const ultimoDiaMesAnterior = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
    const primerDiaMesActual = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

    const { data: gastosMesAnterior } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .gte('date', primerDiaMesAnterior)
      .lte('date', ultimoDiaMesAnterior)

    const { data: gastosMesActual } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .gte('date', primerDiaMesActual)

    const { data: profile } = await supabase
      .from('profiles')
      .select('monthly_income')
      .eq('id', userId)
      .single()

    const totalAnterior = (gastosMesAnterior || []).reduce((s: number, e: any) => s + Number(e.amount), 0)
    const totalActual = (gastosMesActual || []).reduce((s: number, e: any) => s + Number(e.amount), 0)
    const income = profile?.monthly_income || 0
    const disponible = income - totalActual
    const diff = totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior * 100) : 0

    // Gastos por categoría del mes actual
    const porCategoria: Record<string, number> = {}
    ;(gastosMesActual || []).forEach((e: any) => {
      porCategoria[e.category] = (porCategoria[e.category] || 0) + Number(e.amount)
    })
    const topCategorias = Object.entries(porCategoria)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    const mesActualLabel = now.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
    const diffTexto = diff > 0 ? `📈 +${diff.toFixed(1)}% vs mes anterior` : `📉 ${diff.toFixed(1)}% vs mes anterior`
    const diffColor = diff > 0 ? '#b24f58' : '#22c55e'

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    
    <!-- Header -->
    <div style="background:#4C1D95;border-radius:16px;padding:32px;text-align:center;margin-bottom:20px;">
      <h1 style="color:white;margin:0;font-size:28px;font-weight:bold;">Finti</h1>
      <p style="color:#c4b5fd;margin:8px 0 0;font-size:15px;">Tu resumen financiero de ${mesActualLabel}</p>
    </div>

    <!-- Saludo -->
    <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px;">
      <p style="margin:0;font-size:16px;color:#1f1f1f;">Hola <strong>${nombre}</strong> 👋</p>
      <p style="margin:8px 0 0;font-size:14px;color:#5d594f;">Aquí está tu resumen financiero de este mes. ¡Sigue así!</p>
    </div>

    <!-- Cards resumen -->
    <div style="display:grid;gap:12px;margin-bottom:16px;">
      <div style="background:white;border-radius:16px;padding:20px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <p style="margin:0;font-size:12px;color:#8c887d;text-transform:uppercase;font-weight:bold;">Gastado este mes</p>
          <p style="margin:4px 0 0;font-size:24px;font-weight:bold;color:#b24f58;">S/${totalActual.toLocaleString('es-PE')}</p>
        </div>
        <p style="margin:0;font-size:13px;font-weight:bold;color:${diffColor};">${diffTexto}</p>
      </div>
      <div style="background:white;border-radius:16px;padding:20px;">
        <p style="margin:0;font-size:12px;color:#8c887d;text-transform:uppercase;font-weight:bold;">Disponible</p>
        <p style="margin:4px 0 0;font-size:24px;font-weight:bold;color:#22c55e;">S/${disponible.toLocaleString('es-PE')}</p>
      </div>
    </div>

    <!-- Top categorías -->
    ${topCategorias.length > 0 ? `
    <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px;">
      <p style="margin:0 0 16px;font-size:13px;font-weight:bold;color:#47433d;text-transform:uppercase;">Top categorías</p>
      ${topCategorias.map(([cat, amt]) => `
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:14px;color:#403c37;">${cat}</span>
          <span style="font-size:14px;font-weight:bold;color:#1f1f1f;">S/${Number(amt).toLocaleString('es-PE')}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <!-- Consejo IA -->
    <div style="background:#dbefea;border-radius:16px;padding:24px;margin-bottom:16px;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#2b5d58;">💡 Consejo de Finti</p>
      <p style="margin:0;font-size:14px;color:#24514c;line-height:1.6;">
        ${diff > 10 ? `Gastaste ${diff.toFixed(1)}% más que el mes pasado. Revisa tus gastos en ${topCategorias[0]?.[0] || 'tus categorías principales'} para identificar dónde puedes optimizar.` : 
          diff < -10 ? `¡Excelente! Gastaste ${Math.abs(diff).toFixed(1)}% menos que el mes pasado. Considera mover ese ahorro a una de tus metas.` :
          'Mantuviste un gasto similar al mes anterior. Recuerda revisar tus metas de ahorro y ver si puedes aportar un poco más este mes.'}
      </p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:20px;">
      <a href="https://fintiapp.vercel.app/dashboard" style="background:#4C1D95;color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:15px;">Ver mi dashboard →</a>
    </div>

    <!-- Footer -->
    <p style="text-align:center;font-size:12px;color:#8c887d;margin:0;">
      © 2026 Finti · Lima, Perú<br>
      <a href="https://fintiapp.vercel.app/privacidad.html" style="color:#8c887d;">Privacidad</a> · 
      <a href="https://fintiapp.vercel.app/terminos.html" style="color:#8c887d;">Términos</a>
    </p>
  </div>
</body>
</html>`

    await resend.emails.send({
      from: 'Finti <onboarding@resend.dev>',
      to: email,
      subject: `Tu resumen financiero de ${mesActualLabel} 📊`,
      html,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Reporte error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}