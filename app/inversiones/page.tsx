'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { useCurrency } from '../../lib/currencycontext'

const todayStr = () => new Date().toISOString().split('T')[0]

interface Investment {
  id: string; type: string; name: string; amount: number
  yield_percent: number; start_date: string; end_date?: string; notes?: string; currency?: string
}

const TIPOS = [
  { id: 'fondo_mutuo', label: 'Fondo mutuo', color: '#5b4bc4', rec: 'Rendimiento histórico 6-8% anual en Perú. Bajo riesgo. Puedes empezar desde S/100 en Credicorp, BBVA o Interbank. Liquidez en 24-48h.' },
  { id: 'deposito_plazo', label: 'Depósito plazo', color: '#1fa18b', rec: 'Rendimiento 3-6% anual según plazo y banco. Riesgo casi nulo. Tu dinero queda bloqueado hasta el vencimiento.' },
  { id: 'acciones', label: 'Acciones / ETFs', color: '#f1a22e', rec: 'Rendimiento variable, históricamente 8-12% anual en ETFs globales (S&P 500). Riesgo medio-alto. Requiere horizonte de largo plazo (+5 años).' },
  { id: 'cripto', label: 'Cripto (máx. 10%)', color: '#db6334', rec: 'Alta volatilidad. Bitcoin y Ethereum son los más establecidos. Solo invierte lo que puedes perder completamente.' },
  { id: 'otro', label: 'Otro', color: '#94a3b8', rec: 'Incluye inmuebles, negocios propios, préstamos P2P, etc.' },
]

export default function Inversiones() {
  const router = useRouter()
  const { fmt, symbol } = useCurrency()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editandoDist, setEditandoDist] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    type: 'fondo_mutuo', name: '', amount: '', yield_percent: '',
    start_date: todayStr(), end_date: '', notes: '', currency: 'PEN'
  })

  const [dist, setDist] = useState([
    { label: 'Fondos mutuos', pct: 40, color: '#5b4bc4' },
    { label: 'Depósito a plazo', pct: 30, color: '#1fa18b' },
    { label: 'Acciones / ETFs', pct: 20, color: '#f1a22e' },
    { label: 'Cripto (máx.)', pct: 10, color: '#db6334' },
  ])

  const totalDist = dist.reduce((s,d) => s + d.pct, 0)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: inv } = await supabase.from('investments').select('*').eq('user_id', user.id).order('created_at')
      setInvestments(inv || [])
      setLoading(false)
    }
    init()
  }, [])

  const totalPEN = useMemo(() => investments.filter(i => !i.currency || i.currency === 'PEN').reduce((s,i) => s + Number(i.amount), 0), [investments])
  const totalUSD = useMemo(() => investments.filter(i => i.currency === 'USD').reduce((s,i) => s + Number(i.amount), 0), [investments])
  const totalInvertido = totalPEN

  const rendimientoPromedio = useMemo(() => {
    if (investments.length === 0) return 0
    const total = investments.reduce((s,i) => s + Number(i.amount), 0)
    if (total === 0) return 0
    return investments.reduce((s,i) => s + Number(i.amount) * Number(i.yield_percent), 0) / total
  }, [investments])

  const proyeccion = useMemo(() => {
    const r = (rendimientoPromedio || 7) / 100
    const base = totalInvertido || 0
    return {
      y1: base * Math.pow(1 + r, 1),
      y3: base * Math.pow(1 + r, 3),
      y5: base * Math.pow(1 + r, 5),
    }
  }, [totalInvertido, rendimientoPromedio])

  const income = profile?.monthly_income || 0
  const recomendadoMes = Math.round(income * 0.1)

  const alertas = useMemo(() => {
    const alerts: { type: 'warning' | 'danger'; msg: string }[] = []
    if (totalInvertido === 0) return alerts
    const criptoTotal = investments.filter(i => i.type === 'cripto').reduce((s,i) => s + Number(i.amount), 0)
    if (criptoTotal / totalInvertido > 0.1) {
      alerts.push({ type: 'danger', msg: `Estás sobreinvertido en cripto (${Math.round(criptoTotal/totalInvertido*100)}%). Se recomienda máximo 10%.` })
    }
    const vencenProximo = investments.filter(i => {
      if (!i.end_date) return false
      const dias = (new Date(i.end_date).getTime() - Date.now()) / (1000*60*60*24)
      return dias <= 30 && dias > 0
    })
    vencenProximo.forEach(i => {
      alerts.push({ type: 'warning', msg: `"${i.name}" vence en menos de 30 días. Decide si renovar o redirigir el capital.` })
    })
    if (income > 0 && totalInvertido < recomendadoMes * 3) {
      alerts.push({ type: 'warning', msg: `Intenta invertir al menos ${fmt(recomendadoMes)}/mes para hacer crecer tu patrimonio.` })
    }
    return alerts
  }, [investments, totalInvertido, income, recomendadoMes])

  const tipoInfo = TIPOS.find(t => t.id === form.type)

  const agregar = async () => {
    if (!form.name || !form.amount) return
    setGuardando(true)
    const { data, error } = await supabase.from('investments').insert({
      user_id: user.id, type: form.type, name: form.name,
      amount: parseFloat(form.amount), yield_percent: parseFloat(form.yield_percent) || 0,
      start_date: form.start_date, end_date: form.end_date || null,
      notes: form.notes || null, currency: form.currency
    }).select()
    if (!error && data) {
      setInvestments(prev => [...prev, data[0]])
      setForm({ type:'fondo_mutuo', name:'', amount:'', yield_percent:'', start_date:todayStr(), end_date:'', notes:'', currency:'PEN' })
      setIsAdding(false)
    }
    setGuardando(false)
  }

  const eliminar = async (id: string) => {
    await supabase.from('investments').delete().eq('id', id)
    setInvestments(prev => prev.filter(i => i.id !== id))
  }

  if (loading) return <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center"><p className="text-[#8c887d]">Cargando...</p></div>

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || ''

  return (
    <div className="min-h-screen bg-[#f5f3ee]">
      <div className="px-4 pt-5 pb-2 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-[#8c887d] uppercase">{firstName}</p>
          <p className="text-[13px] font-bold tracking-widest text-[#1f1f1f] uppercase">Mis Inversiones</p>
        </div>
        <div className="flex gap-2">
          <Link href="/configuracion" className="w-9 h-9 rounded-full bg-[#ece8df] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5a4bc3" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </Link>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} className="w-9 h-9 rounded-full bg-[#ece8df] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5a4bc3" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>

      <div className="px-4 pb-32 space-y-4 mt-2">

        {/* Cards totales */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[22px] bg-[#f3f0e8] p-4 border border-[#ebe6db]">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#726d62]">Total invertido ({symbol})</p>
            <p className="mt-1 text-[22px] font-bold text-[#5a4bc3]">{fmt(totalPEN)}</p>
            {totalUSD > 0 && <p className="text-[14px] font-bold text-[#1fa18b] mt-1">{`$${totalUSD.toLocaleString('en-US', {minimumFractionDigits:0,maximumFractionDigits:0})}`}</p>}
          </div>
          <div className="rounded-[22px] bg-[#f3f0e8] p-4 border border-[#ebe6db]">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#726d62]">Rendimiento est.</p>
            <p className="mt-1 text-[22px] font-bold text-[#22c55e]">+{rendimientoPromedio.toFixed(1)}%</p>
          </div>
        </div>

        {/* Distribución recomendada */}
        <div className="rounded-[22px] border border-[#ebe6db] bg-[#fcfbf8] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-bold uppercase tracking-wide text-[#47433d]">Distribución recomendada</p>
            <button onClick={() => setEditandoDist(!editandoDist)}
              className="text-[12px] font-bold text-[#5a4bc3] bg-[#ede9ff] px-3 py-1 rounded-full">
              {editandoDist ? 'Listo ✓' : 'Editar'}
            </button>
          </div>
          {editandoDist && (
            <div className={`mb-3 text-[12px] font-bold text-center ${totalDist === 100 ? 'text-[#22c55e]' : 'text-[#b24f58]'}`}>
              Total: {totalDist}% {totalDist === 100 ? '✅' : '⚠️ debe sumar 100%'}
            </div>
          )}
          {dist.map((d, i) => (
            <div key={d.label} className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{background: d.color}}/>
                  <span className="text-[13px] text-[#403c37]">{d.label}</span>
                </div>
                {editandoDist ? (
                  <input type="number" min="0" max="100" value={d.pct}
                    onChange={e => {
                      const newDist = [...dist]
                      newDist[i] = {...newDist[i], pct: parseInt(e.target.value) || 0}
                      setDist(newDist)
                    }}
                    className="w-16 rounded-[10px] border border-[#e5dfd5] bg-[#f7f4ed] px-2 py-1 text-[13px] font-bold text-center outline-none"/>
                ) : (
                  <span className="text-[13px] font-bold text-[#1f1f1f]">{d.pct}%</span>
                )}
              </div>
              {editandoDist ? (
                <input type="range" min="0" max="100" value={d.pct}
                  onChange={e => {
                    const newDist = [...dist]
                    newDist[i] = {...newDist[i], pct: parseInt(e.target.value)}
                    setDist(newDist)
                  }}
                  className="w-full accent-[#5a4bc3]"/>
              ) : (
                <div className="h-2 rounded-full bg-[#ece7dd]">
                  <div className="h-2 rounded-full transition-all" style={{width:`${d.pct}%`, background: d.color}}/>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Proyección */}
        <div className="rounded-[22px] border border-[#ebe6db] bg-[#fcfbf8] p-4">
          <p className="text-[13px] font-bold uppercase tracking-wide text-[#47433d] mb-1">📈 Proyección de tu inversión</p>
          <p className="text-[12px] text-[#8c887d] mb-3">
            {totalInvertido > 0 ? `Basado en ${fmt(totalInvertido)} al ${rendimientoPromedio.toFixed(1)}% anual` : 'Basado en 7% anual de referencia'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[{label:'1 año', val:proyeccion.y1},{label:'3 años', val:proyeccion.y3},{label:'5 años', val:proyeccion.y5}].map(p => (
              <div key={p.label} className="rounded-[16px] bg-[#f3f0e8] p-3 text-center border border-[#ebe6db]">
                <p className="text-[11px] text-[#726d62] font-bold uppercase">{p.label}</p>
                <p className="text-[15px] font-bold text-[#5a4bc3] mt-1">{fmt(p.val)}</p>
                {totalInvertido > 0 && <p className="text-[10px] text-[#22c55e] font-bold">+{fmt(p.val - totalInvertido)}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Recomendador */}
        {income > 0 && (
          <div className="rounded-[22px] border border-[#ebe6db] bg-[#fcfbf8] p-4">
            <p className="text-[13px] font-bold uppercase tracking-wide text-[#47433d] mb-2">🤖 ¿Cuánto debería invertir?</p>
            <p className="text-[13px] text-[#5d594f] mb-2">
              Con tu ingreso de <span className="font-bold text-[#5a4bc3]">{fmt(income)}</span> te recomendamos invertir <span className="font-bold text-[#5a4bc3]">{fmt(recomendadoMes)}/mes</span>:
            </p>
            <div className="space-y-1">
              {dist.map(d => (
                <div key={d.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{background: d.color}}/>
                    <span className="text-[12px] text-[#5d594f]">{d.label}</span>
                  </div>
                  <span className="text-[12px] font-bold text-[#1f1f1f]">{fmt(Math.round(recomendadoMes * d.pct / 100))}</span>
                </div>
              ))}
            </div>
            <p className="text-[12px] text-[#8c887d] mt-3">💡 Primero ten un fondo de emergencia de 3 meses antes de invertir.</p>
          </div>
        )}

        {/* Alertas */}
        <div className="rounded-[22px] border border-[#ebe6db] bg-[#fcfbf8] p-4">
          <p className="text-[13px] font-bold uppercase tracking-wide text-[#47433d] mb-2">⚠️ Alertas de tu portafolio</p>
          {alertas.length === 0 ? (
            <p className="text-[13px] text-[#22c55e] font-medium">✓ Tu portafolio está en buen estado</p>
          ) : alertas.map((a, i) => (
            <div key={i} className={`rounded-[12px] p-3 mb-2 text-[13px] ${a.type==='danger'?'bg-red-50 text-red-700 border border-red-200':'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
              {a.msg}
            </div>
          ))}
        </div>

        {/* Mis inversiones activas */}
        <p className="text-[13px] font-bold uppercase tracking-wide text-[#47433d]">Mis inversiones activas</p>
        {investments.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-[#c8bbf5] bg-[#faf9ff] p-8 text-center">
            <div className="text-4xl mb-3">📈</div>
            <p className="text-[14px] font-medium text-[#26231f]">Aún no tienes inversiones registradas.</p>
            <p className="text-[13px] text-[#8c887d] mt-1">¡Empieza con poco!</p>
          </div>
        ) : investments.map(inv => {
          const tipo = TIPOS.find(t => t.id === inv.type)
          const currency = inv.currency || 'PEN'
          return (
            <div key={inv.id} className="rounded-[22px] border border-[#ebe6db] bg-white p-4" style={{borderLeftWidth:'4px', borderLeftColor: tipo?.color || '#94a3b8'}}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-bold text-[#1f1f1f]">{inv.name}</p>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#e0f2fe] text-[#0369a1]">Activo</span>
                    {currency === 'USD' && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#d1fae5] text-[#065f46]">💵 USD</span>}
                  </div>
                  <p className="text-[12px] text-[#8c887d]">{tipo?.label}</p>
                </div>
                <button onClick={() => eliminar(inv.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#9b968d] hover:text-[#b24f58]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                </button>
              </div>
              <div className="flex justify-between mb-2">
                <div>
                  <p className="text-[11px] text-[#726d62] uppercase font-bold">Invertido</p>
                  <p className="text-[18px] font-bold text-[#1f1f1f]">{inv.currency === 'USD' ? `$${Math.abs(Number(inv.amount)).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0})}` : fmt(Number(inv.amount))}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-[#726d62] uppercase font-bold">Rendimiento</p>
                  <p className="text-[18px] font-bold text-[#22c55e]">+{inv.yield_percent}%</p>
                </div>
              </div>
              {inv.end_date && <p className="text-[12px] text-[#8c887d]">Vence: {new Date(inv.end_date).toLocaleDateString('es-PE',{day:'numeric',month:'long',year:'numeric'})}</p>}
              {inv.notes && <p className="text-[12px] text-[#8c887d] mt-1 italic">"{inv.notes}"</p>}
            </div>
          )
        })}

        <button onClick={() => setIsAdding(true)}
          className="w-full rounded-[16px] bg-[#5a4bc3] py-4 text-[15px] font-bold text-white">
          + Agregar inversión
        </button>
      </div>

      {/* Modal agregar */}
      {isAdding && (
        <div className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm" onClick={() => setIsAdding(false)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-[34px] bg-[#fcfbf8] p-5 pb-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[#ddd7cc]"/>
            <h2 className="text-[18px] font-semibold text-[#24211d] mb-4">Nueva inversión</h2>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {TIPOS.map(t => (
                  <button key={t.id} onClick={() => setForm(p=>({...p,type:t.id}))}
                    className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition-all ${form.type===t.id?'text-white':'border border-[#e5dfd5] text-[#47433d]'}`}
                    style={form.type===t.id?{background:tipoInfo?.color}:{}}>
                    {t.label}
                  </button>
                ))}
              </div>
              {tipoInfo && (
                <div className="rounded-[14px] bg-[#f0fdf4] border border-[#bbf7d0] p-3">
                  <p className="text-[12px] text-[#166534]">ℹ️ {tipoInfo.rec}</p>
                </div>
              )}
              <input type="text" placeholder="Nombre / Entidad (ej: Fondo Mutuo Sura)" value={form.name}
                onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff]"/>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex gap-2">
                  <select value={form.currency} onChange={e=>setForm(p=>({...p,currency:e.target.value}))}
                    className="rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-3 py-3 outline-none font-bold text-[#5a4bc3]">
                    <option value="PEN">S/</option>
                    <option value="USD">$</option>
                  </select>
                  <input type="number" placeholder="Monto" value={form.amount}
                    onChange={e=>setForm(p=>({...p,amount:e.target.value}))}
                    className="flex-1 rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff]"/>
                </div>
                <input type="number" placeholder="Rendimiento % anual" value={form.yield_percent}
                  onChange={e=>setForm(p=>({...p,yield_percent:e.target.value}))}
                  className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff]"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[12px] text-[#726d62] mb-1">Fecha inicio</p>
                  <input type="date" value={form.start_date}
                    onChange={e=>setForm(p=>({...p,start_date:e.target.value}))}
                    className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff]"/>
                </div>
                <div>
                  <p className="text-[12px] text-[#726d62] mb-1">Vencimiento (opcional)</p>
                  <input type="date" value={form.end_date}
                    onChange={e=>setForm(p=>({...p,end_date:e.target.value}))}
                    className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff]"/>
                </div>
              </div>
              <textarea placeholder="Notas (opcional)" value={form.notes}
                onChange={e=>setForm(p=>({...p,notes:e.target.value}))}
                rows={2}
                className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff] resize-none"/>
              <button onClick={agregar} disabled={guardando||!form.name||!form.amount}
                className="w-full rounded-[18px] bg-[#5a4bc3] py-3 text-[15px] font-semibold text-white disabled:opacity-40">
                {guardando?'Guardando...':'Guardar inversión'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#ece8df]">
        <div className="max-w-md mx-auto flex">
          {[
            {href:'/dashboard',label:'Inicio',active:false,icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>},
            {href:'/gastos',label:'Gastos',active:false,icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>},
            {href:'/metas',label:'Metas',active:false,icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>},
            {href:'/inversiones',label:'Inversiones',active:true,icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>},
          ].map((item:any) => (
            <Link key={item.href} href={item.href} className={`flex-1 flex flex-col items-center py-3 gap-1 ${item.active?'text-[#5a4bc3]':'text-[#8c887d]'}`}>
              {item.icon}
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <Link href="/ia" className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-[#5a4bc3] flex items-center justify-center shadow-lg">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </Link>
    </div>
  )
}