'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import TourGuide from '../../components/tourguide'

const fmt = (v: number) => `S/${Math.abs(v).toLocaleString('es-PE', {minimumFractionDigits:0,maximumFractionDigits:0})}`
const todayStr = () => new Date().toISOString().split('T')[0]

interface Investment {
  id: string; type: string; name: string; amount: number
  yield_percent: number; start_date: string; end_date?: string; notes?: string
}

const TIPOS = [
  { id: 'fondo_mutuo', label: 'Fondo mutuo', color: '#5b4bc4', rec: 'Rendimiento histórico 6-8% anual en Perú. Bajo riesgo. Puedes empezar desde S/100 en Credicorp, BBVA o Interbank. Liquidez en 24-48h.' },
  { id: 'deposito_plazo', label: 'Depósito plazo', color: '#1fa18b', rec: 'Rendimiento 3-6% anual según plazo y banco. Riesgo casi nulo. Tu dinero queda bloqueado hasta el vencimiento. Ideal para dinero que no necesitarás pronto.' },
  { id: 'acciones', label: 'Acciones / ETFs', color: '#f1a22e', rec: 'Rendimiento variable, históricamente 8-12% anual en ETFs globales (S&P 500). Riesgo medio-alto. Requiere horizonte de largo plazo (+5 años).' },
  { id: 'cripto', label: 'Cripto (máx. 10%)', color: '#db6334', rec: 'Alta volatilidad. Bitcoin y Ethereum son los más establecidos. Solo invierte lo que puedes perder completamente. Nunca más del 10% de tu portafolio.' },
  { id: 'otro', label: 'Otro', color: '#94a3b8', rec: 'Incluye inmuebles, negocios propios, préstamos P2P, etc. Evalúa bien el riesgo y la liquidez antes de invertir.' },
]

const NOTICIAS = [
  { fuente: 'BVL', tiempo: 'Hace 2h', titulo: 'Fondos mutuos peruanos cierran el mes con rendimiento positivo de 6.8%', tipo: 'fondo_mutuo' },
  { fuente: 'Bloomberg', tiempo: 'Hace 4h', titulo: 'La Fed mantiene tasas: ¿qué significa para tus inversiones en ETFs?', tipo: 'acciones' },
  { fuente: 'Gestión', tiempo: 'Hace 6h', titulo: 'Depósitos a plazo en soles alcanzan tasa promedio de 5.2% en bancos peruanos', tipo: 'deposito_plazo' },
  { fuente: 'CoinDesk', tiempo: 'Hace 8h', titulo: 'Bitcoin supera los $64,000: ¿es momento de rebalancear tu portafolio?', tipo: 'cripto' },
]

export default function Inversiones() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [editando, setEditando] = useState<Investment | null>(null)
  const [editForm, setEditForm] = useState({ type: 'fondo_mutuo', name: '', amount: '', yield_percent: '', start_date: '', end_date: '', notes: '' })
  const [form, setForm] = useState({ type: 'fondo_mutuo', name: '', amount: '', yield_percent: '', start_date: todayStr(), end_date: '', notes: '' })
  const [cotizaciones, setCotizaciones] = useState<any[]>([])
const [cargandoCot, setCargandoCot] = useState(true)
const [montoSim, setMontoSim] = useState('')
const [agregandoCot, setAgregandoCot] = useState(false)
const [nuevaCot, setNuevaCot] = useState({ symbol: '', nombre: '', sub: '' })
const [noticias, setNoticias] = useState<any[]>([])
const [cargandoNoticias, setCargandoNoticias] = useState(true)
const [simbolosGuardados, setSimbolosGuardados] = useState([
  { symbol: 'SPY', nombre: 'S&P 500', sub: 'ETF · USD' },
  { symbol: 'BTC-USD', nombre: 'Bitcoin', sub: 'Cripto · USD' },
  { symbol: 'GC=F', nombre: 'Oro', sub: 'Commodity · USD' },
  { symbol: 'PEN=X', nombre: 'USD/PEN', sub: 'Tipo de cambio' },
])

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
      // Cargar cotizaciones
const cargarCotizaciones = async (simbolos = simbolosGuardados) => {
  setCargandoCot(true)
  try {
    const res = await fetch(`/api/cotizaciones?symbols=${encodeURIComponent(JSON.stringify(simbolos))}`)
    const json = await res.json()
    if (json.ok) setCotizaciones(json.data)
  } catch {}
  setCargandoCot(false)
}
cargarCotizaciones()
// Cargar noticias
const cargarNoticias = async () => {
  setCargandoNoticias(true)
  try {
    const res = await fetch('/api/noticias')
    const json = await res.json()
    if (json.ok) setNoticias(json.data)
  } catch {}
  setCargandoNoticias(false)
}
cargarNoticias()
    }
    init()
  }, [])

  const totalInvertido = useMemo(() => investments.reduce((s,i) => s + Number(i.amount), 0), [investments])
  const rendimientoPromedio = useMemo(() => {
    if (investments.length === 0) return 0
    const total = investments.reduce((s,i) => s + Number(i.amount), 0)
    if (total === 0) return 0
    return investments.reduce((s,i) => s + Number(i.amount) * Number(i.yield_percent), 0) / total
  }, [investments])

  const income = profile?.monthly_income || 0
  const recomendadoMes = Math.round(income * 0.1)

  const alertas = useMemo(() => {
    const alerts: { type: 'warning' | 'danger'; msg: string }[] = []
    if (totalInvertido === 0) return alerts
    const criptoTotal = investments.filter(i => i.type === 'cripto').reduce((s,i) => s + Number(i.amount), 0)
    if (criptoTotal / totalInvertido > 0.1) {
      alerts.push({ type: 'danger', msg: `Estás sobreinvertido en cripto (${Math.round(criptoTotal/totalInvertido*100)}%). Se recomienda máximo 10%.` })
    }
    investments.filter(i => {
      if (!i.end_date) return false
      const dias = (new Date(i.end_date).getTime() - Date.now()) / (1000*60*60*24)
      return dias <= 30 && dias > 0
    }).forEach(i => {
      alerts.push({ type: 'warning', msg: `"${i.name}" vence en menos de 30 días. ¿Renovar o redirigir?` })
    })
    return alerts
  }, [investments, totalInvertido])

  const tipoInfo = TIPOS.find(t => t.id === form.type)

  const agregar = async () => {
    if (!form.name || !form.amount) return
    setGuardando(true)
    const { data, error } = await supabase.from('investments').insert({
      user_id: user.id, type: form.type, name: form.name,
      amount: parseFloat(form.amount), yield_percent: parseFloat(form.yield_percent) || 0,
      start_date: form.start_date, end_date: form.end_date || null, notes: form.notes || null
    }).select()
    if (!error && data) {
      setInvestments(prev => [...prev, data[0]])
      setForm({ type:'fondo_mutuo', name:'', amount:'', yield_percent:'', start_date:todayStr(), end_date:'', notes:'' })
      setIsAdding(false)
    }
    setGuardando(false)
  }

  const guardarEdicion = async () => {
    if (!editando || !editForm.name || !editForm.amount) return
    setGuardando(true)
    await supabase.from('investments').update({
      type: editForm.type, name: editForm.name,
      amount: parseFloat(editForm.amount), yield_percent: parseFloat(editForm.yield_percent) || 0,
      start_date: editForm.start_date, end_date: editForm.end_date || null, notes: editForm.notes || null,
    }).eq('id', editando.id)
    const { data } = await supabase.from('investments').select('*').eq('user_id', user.id).order('created_at')
    setInvestments(data || [])
    setEditando(null)
    setGuardando(false)
  }

  const eliminar = async (id: string) => {
    await supabase.from('investments').delete().eq('id', id)
    setInvestments(prev => prev.filter(i => i.id !== id))
  }

  if (loading) return <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center"><p className="text-[#8c887d]">Cargando...</p></div>

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || ''

  const rendimientos: Record<string, number> = { 'Fondos mutuos': 7, 'Depósito a plazo': 4.5, 'Acciones / ETFs': 10, 'Cripto (máx.)': 20 }
  const riesgos: Record<string, number> = { 'Fondos mutuos': 2, 'Depósito a plazo': 1, 'Acciones / ETFs': 3.5, 'Cripto (máx.)': 5 }
  const rendPonderado = dist.reduce((s, d) => s + (d.pct / 100) * (rendimientos[d.label] || 5), 0)
  const riesgoPonderado = dist.reduce((s, d) => s + (d.pct / 100) * (riesgos[d.label] || 2), 0)
  const base = montoSim ? parseFloat(montoSim) : totalInvertido || 1000
  const y1 = base * Math.pow(1 + rendPonderado / 100, 1)
  const y5 = base * Math.pow(1 + rendPonderado / 100, 5)
  const y10 = base * Math.pow(1 + rendPonderado / 100, 10)
  const nivelRiesgo = riesgoPonderado < 2 ? { label: 'Conservador', color: '#22c55e' }
    : riesgoPonderado < 3.5 ? { label: 'Moderado', color: '#f1a22e' }
    : { label: 'Agresivo', color: '#b24f58' }

  // Noticias filtradas por tipos de inversión del usuario
  const tiposUsuario = investments.map(i => i.type)
  const noticiasFiltradas = NOTICIAS.filter(n =>
    tiposUsuario.length === 0 || tiposUsuario.includes(n.tipo) || true
  )

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

        {/* 1. Resumen */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[22px] bg-[#f3f0e8] p-4 border border-[#ebe6db]">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#726d62]">Total invertido</p>
            <p className="mt-1 text-[22px] font-bold text-[#5a4bc3]">{fmt(totalInvertido)}</p>
          </div>
          <div className="rounded-[22px] bg-[#f3f0e8] p-4 border border-[#ebe6db]">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#726d62]">Rendimiento est.</p>
            <p className="mt-1 text-[22px] font-bold text-[#22c55e]">+{rendimientoPromedio.toFixed(1)}%</p>
            <p className="text-[10px] text-[#8c887d]">anual promedio</p>
          </div>
        </div>

        {/* 2. Simulador de portafolio */}
        <div className="rounded-[22px] border border-[#ebe6db] bg-white p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[13px] font-bold uppercase tracking-wide text-[#47433d]">Simulador</p>
            <div className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${totalDist === 100 ? 'bg-[#e0fdf4] text-[#0f6e56]' : 'bg-[#fef3c7] text-[#b45309]'}`}>
              {totalDist}% {totalDist === 100 ? '✓' : '⚠️'}
            </div>
          </div>
<p className="text-[12px] text-[#8c887d] mb-2">Mueve los sliders y ve el impacto en tiempo real</p>
<div className="flex items-center gap-2 mb-3 rounded-[14px] bg-[#f5f3ee] border border-[#ebe6db] px-3 py-2">
  <span className="text-[13px] text-[#726d62] font-bold">Simular con</span>
  <input type="number" placeholder={totalInvertido > 0 ? String(totalInvertido) : '1000'}
    value={montoSim}
    onChange={e => setMontoSim(e.target.value)}
    className="flex-1 bg-transparent text-[14px] font-bold text-[#5a4bc3] outline-none text-right"/>
  <span className="text-[13px] text-[#726d62] font-bold">S/</span>
</div>
          {dist.map((d, i) => (
            <div key={d.label} className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{background: d.color}}/>
                  <span className="text-[13px] text-[#403c37]">{d.label}</span>
                </div>
                <span className="text-[13px] font-bold text-[#1f1f1f]">{d.pct}%</span>
              </div>
              <input type="range" min="0" max="100" value={d.pct}
                onChange={e => {
                  const newDist = [...dist]
                  newDist[i] = {...newDist[i], pct: parseInt(e.target.value)}
                  setDist(newDist)
                }}
                className="w-full accent-[#5a4bc3]"/>
            </div>
          ))}

          {/* Métricas resultado */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded-[14px] bg-[#f5f3ee] border border-[#ebe6db] p-3 text-center">
              <p className="text-[10px] text-[#726d62] uppercase font-bold mb-1">Rendimiento est.</p>
              <p className="text-[22px] font-bold text-[#22c55e]">{rendPonderado.toFixed(1)}%</p>
              <p className="text-[10px] text-[#8c887d]">anual promedio</p>
            </div>
            <div className="rounded-[14px] bg-[#f5f3ee] border border-[#ebe6db] p-3 text-center">
              <p className="text-[10px] text-[#726d62] uppercase font-bold mb-1">Nivel de riesgo</p>
              <p className="text-[16px] font-bold mt-1" style={{color: nivelRiesgo.color}}>{nivelRiesgo.label}</p>
              <div className="flex justify-center gap-1 mt-1.5">
                {[1,2,3,4,5].map(n => (
                  <div key={n} className="w-4 h-1.5 rounded-full" style={{background: n <= Math.round(riesgoPonderado) ? nivelRiesgo.color : '#ece7dd'}}/>
                ))}
              </div>
            </div>
          </div>

          {/* Proyección única */}
          <div className="rounded-[14px] bg-[#f5f3ee] border border-[#ebe6db] p-3 mt-2">
            <p className="text-[11px] font-bold uppercase text-[#726d62] mb-2">Proyección a futuro</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[{label:'1 año', val:y1},{label:'5 años', val:y5},{label:'10 años', val:y10}].map(p => (
                <div key={p.label}>
                  <p className="text-[10px] text-[#8c887d]">{p.label}</p>
                  <p className="text-[14px] font-bold text-[#5a4bc3]">S/{Math.round(p.val).toLocaleString('es-PE')}</p>
                  <p className="text-[10px] text-[#22c55e] font-bold">+S/{Math.round(p.val - base).toLocaleString('es-PE')}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-[#8c887d] text-center mt-2">💡 Basado en rendimientos históricos. No garantiza resultados futuros.</p>
        </div>

        {/* 3. Cotizaciones en tiempo real */}
<div className="rounded-[22px] border border-[#ebe6db] bg-white p-4">
  <div className="flex items-center justify-between mb-3">
    <p className="text-[13px] font-bold uppercase tracking-wide text-[#47433d]">Cotizaciones</p>
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"/>
        <span className="text-[11px] text-[#22c55e] font-bold">En vivo</span>
      </div>
      <button onClick={() => setAgregandoCot(!agregandoCot)}
        className="text-[11px] font-bold text-[#5a4bc3] bg-[#ede9ff] px-2 py-1 rounded-full">
        + Agregar
      </button>
    </div>
  </div>

  {agregandoCot && (
    <div className="rounded-[16px] bg-[#f5f3ee] border border-[#ebe6db] p-3 mb-3 space-y-2">
      <p className="text-[12px] text-[#8c887d]">Ej: AAPL = Apple, MSFT = Microsoft, ETH-USD = Ethereum</p>
      <input type="text" placeholder="Símbolo (ej: AAPL)" value={nuevaCot.symbol}
        onChange={e => setNuevaCot(p => ({...p, symbol: e.target.value.toUpperCase()}))}
        className="w-full rounded-[12px] border border-[#e5dfd5] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#5a4bc3]"/>
      <input type="text" placeholder="Nombre (ej: Apple)" value={nuevaCot.nombre}
        onChange={e => setNuevaCot(p => ({...p, nombre: e.target.value}))}
        className="w-full rounded-[12px] border border-[#e5dfd5] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#5a4bc3]"/>
      <input type="text" placeholder="Descripción (ej: Acción · USD)" value={nuevaCot.sub}
        onChange={e => setNuevaCot(p => ({...p, sub: e.target.value}))}
        className="w-full rounded-[12px] border border-[#e5dfd5] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#5a4bc3]"/>
      <button onClick={async () => {
        if (!nuevaCot.symbol || !nuevaCot.nombre) return
        const nuevos = [...simbolosGuardados, nuevaCot]
        setSimbolosGuardados(nuevos)
        setNuevaCot({ symbol: '', nombre: '', sub: '' })
        setAgregandoCot(false)
        const res = await fetch(`/api/cotizaciones?symbols=${encodeURIComponent(JSON.stringify(nuevos))}`)
        const json = await res.json()
        if (json.ok) setCotizaciones(json.data)
      }} className="w-full rounded-[12px] bg-[#5a4bc3] py-2 text-[13px] font-bold text-white">
        Agregar cotización
      </button>
    </div>
  )}

  {cargandoCot ? (
    <div className="py-4 text-center">
      <p className="text-[13px] text-[#8c887d]">Cargando precios...</p>
    </div>
  ) : cotizaciones.map((c, i) => (
    <div key={i} className={`flex items-center justify-between py-2.5 ${i < cotizaciones.length-1 ? 'border-b border-[#f0ebe0]' : ''}`}>
      <div>
        <p className="text-[14px] font-semibold text-[#1f1f1f]">{c.nombre}</p>
        <p className="text-[11px] text-[#8c887d]">{c.sub}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="text-[14px] font-bold text-[#1f1f1f]">{c.precio}</p>
          <p className={`text-[12px] font-bold ${c.positivo ? 'text-[#22c55e]' : 'text-[#b24f58]'}`}>
            {c.positivo ? '▲' : '▼'} {c.cambio}
          </p>
        </div>
        <button onClick={() => {
          const nuevos = simbolosGuardados.filter(s => s.symbol !== c.symbol)
          setSimbolosGuardados(nuevos)
          setCotizaciones(prev => prev.filter(p => p.symbol !== c.symbol))
        }} className="w-6 h-6 rounded-full flex items-center justify-center text-[#9b968d] hover:text-[#b24f58]">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  ))}
  <p className="text-[10px] text-[#8c887d] mt-2 text-center">Precios de Alpha Vantage. Actualizado cada hora.</p>
</div>

       {/* 4. Noticias financieras */}
<div className="rounded-[22px] border border-[#ebe6db] bg-white p-4">
  <div className="flex items-center justify-between mb-3">
    <p className="text-[13px] font-bold uppercase tracking-wide text-[#47433d]">Noticias para ti</p>
    <span className="text-[11px] text-[#8c887d]">Actualizado hace 1h</span>
  </div>
  {cargandoNoticias ? (
    <p className="text-[13px] text-[#8c887d] text-center py-4">Cargando noticias...</p>
  ) : noticias.length === 0 ? (
    <p className="text-[13px] text-[#8c887d] text-center py-4">Sin noticias disponibles</p>
  ) : noticias.map((n, i) => (
    <div key={i} className={`py-2.5 ${i < noticias.length-1 ? 'border-b border-[#f0ebe0]' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-[10px] font-bold text-[#8c887d] uppercase">{n.fuente} · {n.tiempo}</p>
          <p className="text-[13px] text-[#1f1f1f] font-medium leading-tight mt-1">{n.titulo}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        {n.url && (
          <a href={n.url} target="_blank" rel="noopener noreferrer"
            className="text-[11px] font-bold text-[#5a4bc3]">
            Leer más →
          </a>
        )}
        <button onClick={() => router.push(`/ia?q=${encodeURIComponent('Explícame esta noticia: ' + n.titulo)}`)}
          className="text-[11px] font-bold text-[#8c887d] bg-[#f5f3ee] px-2 py-0.5 rounded-full">
          Preguntar a IA ✨
        </button>
      </div>
    </div>
  ))}
</div>

        {/* 5. Alertas */}
        {alertas.length > 0 && (
          <div className="rounded-[22px] border border-[#ebe6db] bg-white p-4">
            <p className="text-[13px] font-bold uppercase tracking-wide text-[#47433d] mb-2">⚠️ Alertas</p>
            {alertas.map((a, i) => (
              <div key={i} className={`rounded-[12px] p-3 mb-2 text-[13px] ${a.type==='danger'?'bg-red-50 text-red-700 border border-red-200':'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                {a.msg}
              </div>
            ))}
          </div>
        )}

        {/* 6. Mis inversiones activas */}
        <p className="text-[13px] font-bold uppercase tracking-wide text-[#47433d]">Mis inversiones activas</p>
        {investments.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-[#c8bbf5] bg-[#faf9ff] p-8 text-center">
            <div className="text-4xl mb-3">📈</div>
            <p className="text-[14px] font-medium text-[#26231f]">Aún no tienes inversiones registradas.</p>
            <p className="text-[13px] text-[#8c887d] mt-1">¡Empieza con poco!</p>
          </div>
        ) : investments.map(inv => {
          const tipo = TIPOS.find(t => t.id === inv.type)
          return (
            <div key={inv.id} className="rounded-[22px] border border-[#ebe6db] bg-white p-4" style={{borderLeftWidth:'4px', borderLeftColor: tipo?.color || '#94a3b8'}}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-bold text-[#1f1f1f]">{inv.name}</p>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#e0f2fe] text-[#0369a1]">Activo</span>
                  </div>
                  <p className="text-[12px] text-[#8c887d]">{tipo?.label}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditando(inv); setEditForm({ type: inv.type, name: inv.name, amount: String(inv.amount), yield_percent: String(inv.yield_percent), start_date: inv.start_date, end_date: inv.end_date || '', notes: inv.notes || '' }) }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[#9b968d] hover:text-[#5a4bc3]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button onClick={() => eliminar(inv.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#9b968d] hover:text-[#b24f58]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              </div>
              <div className="flex justify-between mb-2">
                <div>
                  <p className="text-[11px] text-[#726d62] uppercase font-bold">Invertido</p>
                  <p className="text-[18px] font-bold text-[#1f1f1f]">{fmt(inv.amount)}</p>
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

        <button data-tour="agregar-inversion" onClick={() => setIsAdding(true)}
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
                    style={form.type===t.id?{background:t.color}:{}}>
                    {t.label}
                  </button>
                ))}
              </div>
              {tipoInfo && (
                <div className="rounded-[14px] bg-[#f0fdf4] border border-[#bbf7d0] p-3">
                  <p className="text-[12px] text-[#166534]">ℹ️ {tipoInfo.rec}</p>
                </div>
              )}
              <input type="text" placeholder="Nombre / Entidad (ej: Fondo Mutuo Sura Conservador)" value={form.name}
                onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff]"/>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Monto (S/)" value={form.amount}
                  onChange={e=>setForm(p=>({...p,amount:e.target.value}))}
                  className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff]"/>
                <input type="number" placeholder="Rendimiento % anual" value={form.yield_percent}
                  onChange={e=>setForm(p=>({...p,yield_percent:e.target.value}))}
                  className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff]"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[12px] text-[#726d62] mb-1">Fecha inicio</p>
                  <input type="date" value={form.start_date} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))}
                    className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff]"/>
                </div>
                <div>
                  <p className="text-[12px] text-[#726d62] mb-1">Vencimiento (opcional)</p>
                  <input type="date" value={form.end_date} onChange={e=>setForm(p=>({...p,end_date:e.target.value}))}
                    className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff]"/>
                </div>
              </div>
              <textarea placeholder="Notas (opcional)" value={form.notes}
                onChange={e=>setForm(p=>({...p,notes:e.target.value}))}
                rows={2} className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff] resize-none"/>
              <button onClick={agregar} disabled={guardando||!form.name||!form.amount}
                className="w-full rounded-[18px] bg-[#5a4bc3] py-3 text-[15px] font-semibold text-white disabled:opacity-40">
                {guardando?'Guardando...':'Guardar inversión'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar */}
      {editando && (
        <div className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm" onClick={() => setEditando(null)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-[34px] bg-[#fcfbf8] p-5 pb-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[#ddd7cc]"/>
            <h2 className="text-[18px] font-semibold text-[#24211d] mb-4">Editar inversión</h2>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {TIPOS.map(t => (
                  <button key={t.id} onClick={() => setEditForm(p=>({...p,type:t.id}))}
                    className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition-all ${editForm.type===t.id?'text-white':'border border-[#e5dfd5] text-[#47433d]'}`}
                    style={editForm.type===t.id?{background:t.color}:{}}>
                    {t.label}
                  </button>
                ))}
              </div>
              <input type="text" placeholder="Nombre / Entidad" value={editForm.name}
                onChange={e=>setEditForm(p=>({...p,name:e.target.value}))}
                className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff]"/>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Monto (S/)" value={editForm.amount}
                  onChange={e=>setEditForm(p=>({...p,amount:e.target.value}))}
                  className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff]"/>
                <input type="number" placeholder="Rendimiento % anual" value={editForm.yield_percent}
                  onChange={e=>setEditForm(p=>({...p,yield_percent:e.target.value}))}
                  className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff]"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[12px] text-[#726d62] mb-1">Fecha inicio</p>
                  <input type="date" value={editForm.start_date} onChange={e=>setEditForm(p=>({...p,start_date:e.target.value}))}
                    className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff]"/>
                </div>
                <div>
                  <p className="text-[12px] text-[#726d62] mb-1">Vencimiento (opcional)</p>
                  <input type="date" value={editForm.end_date} onChange={e=>setEditForm(p=>({...p,end_date:e.target.value}))}
                    className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff]"/>
                </div>
              </div>
              <textarea placeholder="Notas (opcional)" value={editForm.notes}
                onChange={e=>setEditForm(p=>({...p,notes:e.target.value}))}
                rows={2} className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff] resize-none"/>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setEditando(null)}
                  className="rounded-[18px] border border-[#e2decb] py-3 text-[14px] text-[#8c887d]">Cancelar</button>
                <button onClick={guardarEdicion} disabled={guardando||!editForm.name||!editForm.amount}
                  className="rounded-[18px] bg-[#5a4bc3] py-3 text-[14px] font-bold text-white disabled:opacity-40">
                  {guardando?'Guardando...':'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      <TourGuide tourKey="inversiones" steps={[
        { target: 'agregar-inversion', title: '💼 Agrega tu primera inversión', message: 'Registra fondos mutuos, depósitos o ETFs y Finti calculará tu rendimiento automáticamente.', position: 'top' }
      ]}/>
    </div>
  )
}