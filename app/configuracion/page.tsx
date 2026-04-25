'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function Configuracion() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [seccion, setSeccion] = useState<'menu' | 'perfil' | 'historial' | 'plan'>('menu')
  const [guardando, setGuardando] = useState(false)
  const [historial, setHistorial] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [form, setForm] = useState({ full_name: '', monthly_income: '', salary_day: '' })
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      setForm({
        full_name: prof?.full_name || user.user_metadata?.full_name || '',
        monthly_income: prof?.monthly_income || '',
        salary_day: prof?.salary_day || '',
      })
      const { data: exp } = await supabase.from('expenses').select('amount, date, description, category').eq('user_id', user.id)
      setExpenses(exp || [])
      if (exp) {
        const byMonth: Record<string, number> = {}
        exp.forEach((e: any) => {
          const d = new Date(e.date)
          const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
          byMonth[key] = (byMonth[key] || 0) + Number(e.amount)
        })
        const sorted = Object.entries(byMonth).sort((a,b) => b[0].localeCompare(a[0])).map(([key, total]) => {
          const [year, month] = key.split('-')
          const date = new Date(parseInt(year), parseInt(month)-1, 1)
          return { label: date.toLocaleDateString('es-PE',{month:'long',year:'numeric'}), total, key }
        })
        setHistorial(sorted)
      }
      setLoading(false)
    }
    init()
  }, [])

  const guardarPerfil = async () => {
    if (!form.full_name || !form.monthly_income || !form.salary_day) return
    setGuardando(true)
    await supabase.from('profiles').update({
      full_name: form.full_name,
      monthly_income: parseFloat(form.monthly_income),
      salary_day: parseInt(form.salary_day),
    }).eq('id', user.id)
    setMsg('✅ Cambios guardados')
    setTimeout(() => setMsg(''), 3000)
    setGuardando(false)
  }

  const eliminarCuenta = async () => {
    if (!confirm('¿Estás seguro? Esta acción no se puede deshacer.')) return
    await supabase.from('expenses').delete().eq('user_id', user.id)
    await supabase.from('goals').delete().eq('user_id', user.id)
    await supabase.from('investments').delete().eq('user_id', user.id)
    await supabase.from('profiles').delete().eq('id', user.id)
    await supabase.auth.signOut()
    router.push('/')
  }

  const exportarPDF = async () => {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const now = new Date()
    const mes = now.toLocaleDateString('es-PE', {month:'long', year:'numeric'})
    doc.setFontSize(20)
    doc.setTextColor(76, 29, 149)
    doc.text('Finti — Resumen Financiero', 20, 20)
    doc.setFontSize(12)
    doc.setTextColor(100, 100, 100)
    doc.text(`Usuario: ${form.full_name}`, 20, 35)
    doc.text(`Período: ${mes}`, 20, 43)
    doc.text(`Ingreso mensual: S/${parseFloat(form.monthly_income || '0').toLocaleString('es-PE')}`, 20, 51)
    const mesActual = expenses.filter(e => {
      const d = new Date(e.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const totalMes = mesActual.reduce((s, e) => s + Number(e.amount), 0)
    const disponible = parseFloat(form.monthly_income || '0') - totalMes
    doc.setFontSize(14)
    doc.setTextColor(178, 79, 88)
    doc.text(`Total gastado: S/${totalMes.toLocaleString('es-PE')}`, 20, 65)
    doc.setTextColor(69, 125, 49)
    doc.text(`Disponible: S/${disponible.toLocaleString('es-PE')}`, 20, 75)
    doc.setFontSize(13)
    doc.setTextColor(50, 50, 50)
    doc.text('Últimos gastos del mes:', 20, 90)
    let y = 100
    mesActual.slice(0, 15).forEach(e => {
      doc.setFontSize(10)
      doc.setTextColor(80, 80, 80)
      doc.text(`• ${e.description} (${e.category})`, 22, y)
      doc.text(`S/${Number(e.amount).toLocaleString('es-PE')}`, 170, y, {align:'right'})
      y += 8
      if (y > 270) { doc.addPage(); y = 20 }
    })
    doc.setFontSize(9)
    doc.setTextColor(150, 150, 150)
    doc.text('Generado por Finti — Tu gestor financiero inteligente', 20, 285)
    doc.save(`finti-resumen-${now.getFullYear()}-${now.getMonth()+1}.pdf`)
  }

  if (loading) return <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center"><p className="text-[#8c887d]">Cargando...</p></div>

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || ''

  return (
    <div className="min-h-screen bg-[#f5f3ee]">
      <div className="px-4 pt-5 pb-2 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-[#8c887d] uppercase">{firstName}</p>
          <p className="text-[13px] font-bold tracking-widest text-[#1f1f1f] uppercase">
            {seccion === 'menu' ? 'Configuración' : seccion === 'perfil' ? 'Mi Perfil' : seccion === 'plan' ? 'Mi Plan Financiero' : 'Historial de meses'}
          </p>
        </div>
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} className="w-9 h-9 rounded-full bg-[#ece8df] flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5a4bc3" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>

      <div className="px-4 pb-32 mt-2">

        {seccion === 'menu' && (
          <div className="space-y-3">
            <p className="text-[13px] text-[#8c887d]">Gestiona tu cuenta y preferencias.</p>
            {[
              { label: 'Mi perfil', icon: '👤', onClick: () => setSeccion('perfil') },
              { label: 'Mi plan 50/30/20', icon: '📊', onClick: () => setSeccion('plan') },
              { label: 'Historial de meses', icon: '🕐', onClick: () => setSeccion('historial') },
            ].map(item => (
              <button key={item.label} onClick={item.onClick}
                className="w-full flex items-center gap-4 rounded-[22px] bg-white border border-[#ebe6db] p-4">
                <div className="w-10 h-10 rounded-full bg-[#5a4bc3] flex items-center justify-center text-lg">{item.icon}</div>
                <span className="text-[15px] font-medium text-[#1f1f1f]">{item.label}</span>
                <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8c887d" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            ))}

            <div className="flex items-center justify-between rounded-[22px] bg-white border border-[#ebe6db] p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#5a4bc3] flex items-center justify-center text-lg">🔔</div>
                <span className="text-[15px] font-medium text-[#1f1f1f]">Notificaciones</span>
              </div>
              <button onClick={async () => {
                if (!('serviceWorker' in navigator) || !('PushManager' in window)) { setMsg('❌ Tu navegador no soporta push'); return }
try {
                const permission = await Notification.requestPermission()
                if (permission !== 'granted') { alert('Debes permitir las notificaciones para activarlas.'); return }
                const reg = await navigator.serviceWorker.ready
                const existing = await reg.pushManager.getSubscription()
                const sub = existing || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY })
                const res = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, subscription: sub }) })
                const resData = await res.json()
if (res.ok) setMsg('✅ Notificaciones activadas')
else setMsg('❌ Error: ' + JSON.stringify(resData))
              } catch (err) {
                setMsg('❌ Excepción: ' + String(err))
              }
              }} className="text-[13px] font-bold text-white bg-[#5a4bc3] px-4 py-2 rounded-full">
                Activar
              </button>
            </div>

            <button onClick={exportarPDF}
              className="w-full flex items-center gap-4 rounded-[22px] bg-white border border-[#ebe6db] p-4">
              <div className="w-10 h-10 rounded-full bg-[#22c55e] flex items-center justify-center text-lg">📄</div>
              <span className="text-[15px] font-medium text-[#1f1f1f]">Exportar resumen en PDF</span>
              <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8c887d" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>

            <button onClick={async () => {
              const res = await fetch('/api/reporte', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, email: user.email, nombre: form.full_name }) })
              if (res.ok) setMsg('✅ Reporte enviado a tu email')
              else setMsg('❌ Error al enviar reporte')
            }} className="w-full flex items-center gap-4 rounded-[22px] bg-white border border-[#ebe6db] p-4">
              <div className="w-10 h-10 rounded-full bg-[#5a4bc3] flex items-center justify-center text-lg">📧</div>
              <span className="text-[15px] font-medium text-[#1f1f1f]">Enviar reporte por email</span>
              <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8c887d" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            {msg && <p className="text-center text-[13px] font-medium text-[#22c55e]">{msg}</p>}
          </div>
        )}

        {seccion === 'perfil' && (
          <div className="space-y-4">
            <button onClick={() => setSeccion('menu')} className="flex items-center gap-2 text-[#5a4bc3] text-[14px] font-medium">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              Volver
            </button>
            <div className="flex flex-col items-center py-4">
              <div className="w-20 h-20 rounded-full bg-[#5a4bc3] flex items-center justify-center text-3xl font-bold text-white mb-3">
                {form.full_name.charAt(0).toUpperCase()}
              </div>
              <p className="text-[16px] font-bold text-[#1f1f1f]">{form.full_name}</p>
              <p className="text-[13px] text-[#8c887d]">{user.email}</p>
            </div>
            <div className="rounded-[22px] border border-[#ebe6db] bg-white p-4 space-y-3">
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#5a4bc3]">Datos personales</p>
              <div>
                <p className="text-[11px] font-bold uppercase text-[#726d62] mb-1">Nombre completo</p>
                <input type="text" value={form.full_name} onChange={e=>setForm(p=>({...p,full_name:e.target.value}))}
                  className="w-full rounded-[14px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 text-[14px] outline-none focus:border-[#5a4bc3]"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase text-[#726d62] mb-1">Ingreso (S/)</p>
                  <input type="number" value={form.monthly_income} onChange={e=>setForm(p=>({...p,monthly_income:e.target.value}))}
                    className="w-full rounded-[14px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 text-[14px] outline-none focus:border-[#5a4bc3]"/>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase text-[#726d62] mb-1">Día cobro</p>
                  <input type="number" min="1" max="31" value={form.salary_day} onChange={e=>setForm(p=>({...p,salary_day:e.target.value}))}
                    className="w-full rounded-[14px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 text-[14px] outline-none focus:border-[#5a4bc3]"/>
                </div>
              </div>
              {msg && <p className="text-[13px] text-[#22c55e] font-medium">{msg}</p>}
              <button onClick={guardarPerfil} disabled={guardando}
                className="w-full rounded-[14px] bg-[#5a4bc3] py-3 text-[14px] font-bold text-white disabled:opacity-40">
                {guardando ? 'Guardando...' : '💾 Guardar cambios'}
              </button>
            </div>
            <div className="rounded-[22px] border border-[#ebe6db] bg-white p-4">
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#5a4bc3] mb-2">Seguridad</p>
              <p className="text-[13px] text-[#8c887d]">Tu cuenta usa autenticación con Google. Para cambiar tu contraseña ve a tu cuenta de Google.</p>
            </div>
            <div className="rounded-[22px] border border-red-200 bg-red-50 p-4">
              <button onClick={eliminarCuenta} className="w-full flex items-center justify-center gap-2 text-[14px] font-bold text-red-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                Eliminar cuenta
              </button>
              <p className="text-[11px] text-red-400 text-center mt-1">Esta acción eliminará todos tus datos permanentemente.</p>
            </div>
          </div>
        )}

        {seccion === 'plan' && (
          <div className="space-y-4">
            <button onClick={() => setSeccion('menu')} className="flex items-center gap-2 text-[#5a4bc3] text-[14px] font-medium">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              Volver
            </button>
            <div className="rounded-[22px] border border-[#ebe6db] bg-white p-4 space-y-4">
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#5a4bc3]">Modo primer sueldo</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-medium text-[#1f1f1f]">Activar plan de distribución</p>
                  <p className="text-[12px] text-[#8c887d]">Divide tu sueldo en necesidades, gustos y ahorro</p>
                </div>
                <button onClick={async () => {
                  const newVal = !profile?.is_first_salary_mode
                  await supabase.from('profiles').update({ is_first_salary_mode: newVal }).eq('id', user.id)
                  setProfile((p: any) => ({...p, is_first_salary_mode: newVal}))
                }} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${profile?.is_first_salary_mode ? 'bg-[#5a4bc3]' : 'bg-[#ddd7cc]'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${profile?.is_first_salary_mode ? 'translate-x-6' : 'translate-x-1'}`}/>
                </button>
              </div>
            </div>
            {profile?.is_first_salary_mode && (
              <div className="rounded-[22px] border border-[#ebe6db] bg-white p-4 space-y-4">
                <p className="text-[12px] font-bold uppercase tracking-wide text-[#5a4bc3]">Distribución de tu sueldo</p>
                <p className="text-[13px] text-[#8c887d]">Los porcentajes deben sumar 100%</p>
                {[
                  { label: '🍽️ Necesidades', key: 'needs_percent', color: '#5b4bc4' },
                  { label: '🛍️ Gustos', key: 'wants_percent', color: '#f1a22e' },
                  { label: '🐷 Ahorro', key: 'savings_percent', color: '#22c55e' },
                ].map(item => (
                  <div key={item.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[14px] text-[#403c37]">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" max="100"
                          value={(profile as any)?.[item.key] || 0}
                          onChange={e => setProfile((p: any) => ({...p, [item.key]: parseInt(e.target.value) || 0}))}
                          className="w-16 rounded-[10px] border border-[#e5dfd5] bg-[#f7f4ed] px-2 py-1 text-[13px] font-bold text-center outline-none focus:border-[#5a4bc3]"/>
                        <span className="text-[13px] text-[#8c887d]">%</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-[#ece7dd]">
                      <div className="h-2 rounded-full transition-all" style={{width:`${(profile as any)?.[item.key] || 0}%`, backgroundColor: item.color}}/>
                    </div>
                  </div>
                ))}
                {(() => {
                  const total = ((profile as any)?.needs_percent || 0) + ((profile as any)?.wants_percent || 0) + ((profile as any)?.savings_percent || 0)
                  return (
                    <div className={`text-center text-[13px] font-bold ${total === 100 ? 'text-[#22c55e]' : 'text-[#b24f58]'}`}>
                      Total: {total}% {total === 100 ? '✅' : '⚠️ debe sumar 100%'}
                    </div>
                  )
                })()}
                <button onClick={async () => {
                  const needs = (profile as any)?.needs_percent || 0
                  const wants = (profile as any)?.wants_percent || 0
                  const savings = (profile as any)?.savings_percent || 0
                  if (needs + wants + savings !== 100) { setMsg('⚠️ Los porcentajes deben sumar 100%'); return }
                  await supabase.from('profiles').update({ needs_percent: needs, wants_percent: wants, savings_percent: savings }).eq('id', user.id)
                  setMsg('✅ Plan actualizado')
                  setTimeout(() => setMsg(''), 3000)
                }} className="w-full rounded-[14px] bg-[#5a4bc3] py-3 text-[14px] font-bold text-white">
                  Guardar plan
                </button>
                {msg && <p className="text-center text-[13px] font-medium text-[#22c55e]">{msg}</p>}
              </div>
            )}
          </div>
        )}

        {seccion === 'historial' && (
          <div className="space-y-4">
            <button onClick={() => setSeccion('menu')} className="flex items-center gap-2 text-[#5a4bc3] text-[14px] font-medium">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              Volver
            </button>
            {historial.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[15px] font-medium text-[#26231f]">Sin historial aún</p>
                <p className="text-[13px] text-[#8c887d] mt-1">Registra gastos para ver tu historial mensual.</p>
              </div>
            ) : (
              <>
                <div className="rounded-[22px] border border-[#ebe6db] bg-white p-4">
                  <p className="text-[12px] font-bold uppercase tracking-wide text-[#5a4bc3] mb-3">Evolución de gastos</p>
                  {(() => {
                    const datos = [...historial].reverse()
                    const max = Math.max(...datos.map(d => d.total), 1)
                    const w = 300, h = 120, pad = 10
                    const points = datos.map((d, i) => ({
                      x: pad + (i / Math.max(datos.length - 1, 1)) * (w - pad * 2),
                      y: pad + (1 - d.total / max) * (h - pad * 2),
                      label: d.label,
                      total: d.total
                    }))
                    const polyline = points.map(p => `${p.x},${p.y}`).join(' ')
                    const area = `${points[0].x},${h} ${polyline} ${points[points.length-1].x},${h}`
                    return (
                      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="120">
                        <defs>
                          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#5a4bc3" stopOpacity="0.3"/>
                            <stop offset="100%" stopColor="#5a4bc3" stopOpacity="0.02"/>
                          </linearGradient>
                        </defs>
                        <polygon points={area} fill="url(#areaGrad)"/>
                        <polyline points={polyline} fill="none" stroke="#5a4bc3" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
                        {points.map((p, i) => (
                          <g key={i}>
                            <circle cx={p.x} cy={p.y} r="3" fill="#5a4bc3"/>
                            {i === points.length - 1 && (
                              <>
                                <circle cx={p.x} cy={p.y} r="5" fill="none" stroke="#5a4bc3" strokeWidth="1.5"/>
                                <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fill="#5a4bc3" fontWeight="bold">
                                  S/{Math.round(p.total).toLocaleString('es-PE')}
                                </text>
                              </>
                            )}
                          </g>
                        ))}
                        {points.map((p, i) => (
                          i % Math.max(1, Math.floor(points.length / 4)) === 0 && (
                            <text key={i} x={p.x} y={h - 2} textAnchor="middle" fontSize="8" fill="#8c887d">
                              {p.label.slice(0, 3)}
                            </text>
                          )
                        ))}
                      </svg>
                    )
                  })()}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-[16px] bg-[#f3f0e8] p-3 text-center border border-[#ebe6db]">
                    <p className="text-[10px] font-bold uppercase text-[#726d62] mb-1">Mejor mes</p>
                    <p className="text-[13px] font-bold text-[#22c55e]">S/{Math.min(...historial.map(h=>h.total)).toLocaleString('es-PE')}</p>
                    <p className="text-[10px] text-[#8c887d] capitalize">{historial.reduce((a,b) => a.total < b.total ? a : b).label.split(' ')[0]}</p>
                  </div>
                  <div className="rounded-[16px] bg-[#f3f0e8] p-3 text-center border border-[#ebe6db]">
                    <p className="text-[10px] font-bold uppercase text-[#726d62] mb-1">Promedio</p>
                    <p className="text-[13px] font-bold text-[#5a4bc3]">S/{Math.round(historial.reduce((s,h)=>s+h.total,0)/historial.length).toLocaleString('es-PE')}</p>
                    <p className="text-[10px] text-[#8c887d]">por mes</p>
                  </div>
                  <div className="rounded-[16px] bg-[#f3f0e8] p-3 text-center border border-[#ebe6db]">
                    <p className="text-[10px] font-bold uppercase text-[#726d62] mb-1">Mayor gasto</p>
                    <p className="text-[13px] font-bold text-[#b24f58]">S/{Math.max(...historial.map(h=>h.total)).toLocaleString('es-PE')}</p>
                    <p className="text-[10px] text-[#8c887d] capitalize">{historial.reduce((a,b) => a.total > b.total ? a : b).label.split(' ')[0]}</p>
                  </div>
                </div>
                {historial.map((h, i) => {
                  const prev = historial[i+1]
                  const diff = prev ? ((h.total - prev.total) / prev.total * 100) : null
                  const barWidth = Math.round((h.total / Math.max(...historial.map(x=>x.total))) * 100)
                  return (
                    <div key={h.key} className="rounded-[22px] border border-[#ebe6db] bg-white p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[14px] font-bold text-[#1f1f1f] capitalize">{h.label}</p>
                        <div className="flex items-center gap-2">
                          {diff !== null && (
                            <span className={`text-[12px] font-bold ${diff > 0 ? 'text-red-500' : 'text-[#22c55e]'}`}>
                              {diff > 0 ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}%
                            </span>
                          )}
                          <p className="text-[16px] font-bold text-[#b24f58]">S/{h.total.toLocaleString('es-PE')}</p>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#f0ebe0]">
                        <div className="h-1.5 rounded-full bg-[#5a4bc3] transition-all" style={{width:`${barWidth}%`}}/>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#ece8df]">
        <div className="max-w-md mx-auto flex">
          {[
            {href:'/dashboard',label:'Inicio',active:false,icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>},
            {href:'/gastos',label:'Gastos',active:false,icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>},
            {href:'/metas',label:'Metas',active:false,icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>},
            {href:'/inversiones',label:'Inversiones',active:false,icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>},
          ].map((item:any) => (
            <Link key={item.href} href={item.href} className={`flex-1 flex flex-col items-center py-3 gap-1 ${item.active?'text-[#5a4bc3]':'text-[#8c887d]'}`}>
              {item.icon}
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}