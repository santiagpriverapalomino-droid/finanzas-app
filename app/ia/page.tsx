'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import TourGuide from '../../components/tourguide'

interface Mensaje { rol: 'ia' | 'user'; texto: string }
interface MsgApi { role: string; content: string }

const PREGUNTAS_SUGERIDAS = [
  '¿Cómo puedo ahorrar con mi sueldo mínimo?',
  '¿Me conviene la AFP o la ONP?',
  '¿Cómo invierto mis primeros S/500?',
  '¿Cómo salgo de una deuda rápido?',
]

export default function ChatIA() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [gastos, setGastos] = useState<any[]>([])
  const [gastosHistorial, setGastosHistorial] = useState<any[]>([])
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [historialApi, setHistorialApi] = useState<MsgApi[]>([])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0]
      const { data: exp } = await supabase.from('expenses').select('*').eq('user_id', user.id).gte('date', firstDay)
      const { data: expHistorial } = await supabase.from('expenses').select('amount, date, category').eq('user_id', user.id).gte('date', threeMonthsAgo).lt('date', firstDay)
      setGastos(exp || [])
      setGastosHistorial(expHistorial || [])

      const nombre = user.user_metadata?.full_name?.split(' ')[0] || 'ahí'
      const totalGastado = (exp || []).reduce((s: number, e: any) => s + Number(e.amount), 0)
      const tieneGastos = (exp || []).length > 0

      const bienvenida = tieneGastos
        ? `Hola ${nombre} 👋 Este mes llevas S/${totalGastado.toLocaleString('es-PE')} gastados. Pregúntame cualquier cosa sobre finanzas o cómo mejorar tus hábitos.`
        : `Hola ${nombre} 👋 Aún no registras gastos este mes, pero puedo ayudarte con consejos financieros simples y realistas. ¿En qué te ayudo?`

      setMensajes([{ rol: 'ia', texto: bienvenida }])
      setLoading(false)
    }
    init()
  }, [])

  const enviar = async (pregunta?: string) => {
    const texto = pregunta || input.trim()
    if (!texto || cargando) return
    setInput('')
    setMensajes(prev => [...prev, { rol: 'user', texto }])
    setCargando(true)

    const resumen = gastos.map((g: any) => `${g.description}: S/${g.amount} (${g.category}) - ${g.date}`).join('\n')

      const totalMes = gastos.reduce((s: number, e: any) => s + Number(e.amount), 0)
      const ingreso = profile?.monthly_income || 0
      const disponible = ingreso - totalMes

      const resumenHistorial = gastosHistorial.length > 0
        ? (() => {
            const byMonth: Record<string, number> = {}
            gastosHistorial.forEach((e: any) => {
              const key = e.date.slice(0, 7)
              byMonth[key] = (byMonth[key] || 0) + Number(e.amount)
            })
            return Object.entries(byMonth).map(([k, v]) => `${k}: S/${v.toFixed(0)}`).join(', ')
          })()
        : null

      const hoyDia = new Date().getDate()
const diasEnMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
const gastoEsperadoAFecha = ingreso > 0 ? Math.round(ingreso * hoyDia / diasEnMes) : 0

const contextoUsuario = [
  ingreso > 0 ? `Ingreso mensual: S/${ingreso}` : null,
  `Hoy es el día ${hoyDia} de ${diasEnMes} del mes (faltan ${diasEnMes - hoyDia} días)`,
  ingreso > 0 ? `Total gastado hasta hoy: S/${totalMes.toFixed(0)} de S/${ingreso} (${Math.round(totalMes/ingreso*100)}% del ingreso mensual)` : null,
  ingreso > 0 ? `Gasto esperado a esta altura del mes: S/${gastoEsperadoAFecha} — el usuario lleva ${totalMes <= gastoEsperadoAFecha ? 'MENOS de lo esperado (va bien)' : 'MÁS de lo esperado (ojo con eso)'}` : null,
  ingreso > 0 ? `Disponible estimado al fin de mes: S/${disponible.toFixed(0)}` : null,
  profile?.salary_day ? `Día de cobro: ${profile.salary_day}` : null,
  profile?.needs_percent ? `Plan de distribución: ${profile.needs_percent}% necesidades, ${profile.wants_percent}% gustos, ${profile.savings_percent}% ahorro` : null,
  resumenHistorial ? `Gastos últimos 3 meses: ${resumenHistorial}` : null,
].filter(Boolean).join('\n')
    const msgUsuario = resumen
      ? `Mis gastos de este mes:\n${resumen}\n\nPregunta: ${texto}`
      : texto

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pregunta: texto, resumenGastos: resumen, contextoUsuario, historial: historialApi, nombreUsuario: user?.user_metadata?.full_name?.split(' ')[0] || 'amigo' })      })
      const { respuesta } = await res.json()
      setMensajes(prev => [...prev, { rol: 'ia', texto: respuesta }])
      setHistorialApi(prev => [
        ...prev,
        { role: 'user', content: msgUsuario },
        { role: 'assistant', content: respuesta }
      ])
    } catch {
      setMensajes(prev => [...prev, { rol: 'ia', texto: 'Hubo un error. Intenta de nuevo.' }])
    }
    setCargando(false)
  }

  if (loading) return <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center"><p className="text-[#8c887d]">Cargando...</p></div>

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || ''

  return (
    <div className="min-h-screen bg-[#f5f3ee] flex flex-col">
      <div className="px-4 pt-5 pb-2 flex items-start justify-between flex-shrink-0">
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-[#8c887d] uppercase">{firstName}</p>
          <p className="text-[13px] font-bold tracking-widest text-[#1f1f1f] uppercase">Asesor Finti IA</p>
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

      <div className="flex-1 overflow-y-auto px-4 py-2 pb-4 space-y-3">
        {mensajes.map((m, i) => (
          <div key={i} className={`flex ${m.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.rol === 'ia' && (
              <div className="w-7 h-7 rounded-full bg-[#5a4bc3] flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
            )}
            <div className={`max-w-[78%] rounded-[20px] px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap ${
              m.rol === 'user'
                ? 'bg-[#5a4bc3] text-white rounded-tr-[4px]'
                : 'bg-white border border-[#ebe6db] text-[#1f1f1f] rounded-tl-[4px]'
            }`}>
              {m.texto}
            </div>
          </div>
        ))}

        {cargando && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-[#5a4bc3] flex items-center justify-center mr-2 flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div className="bg-white border border-[#ebe6db] rounded-[20px] rounded-tl-[4px] px-4 py-3">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 rounded-full bg-[#5a4bc3] animate-bounce" style={{animationDelay:'0ms'}}/>
                <div className="w-2 h-2 rounded-full bg-[#5a4bc3] animate-bounce" style={{animationDelay:'150ms'}}/>
                <div className="w-2 h-2 rounded-full bg-[#5a4bc3] animate-bounce" style={{animationDelay:'300ms'}}/>
              </div>
            </div>
          </div>
        )}
      </div>

      {mensajes.length <= 1 && (
        <div className="px-4 pb-2 flex-shrink-0">
          <div className="flex flex-wrap gap-2" data-tour="preguntas">
            {PREGUNTAS_SUGERIDAS.map(p => (
              <button key={p} onClick={() => enviar(p)}
                className="rounded-full border border-[#c8bbf5] bg-[#ede9ff] px-3 py-1.5 text-[12px] font-medium text-[#5a4bc3] hover:bg-[#ddd5ff] transition-colors">
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pb-24 flex-shrink-0">
        <div className="flex gap-2 bg-white rounded-[22px] border border-[#ebe6db] p-2" data-tour="input-ia">
          <input
            type="text"
            placeholder="Asesor Finti está atento..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && enviar()}
            className="flex-1 bg-transparent px-3 py-2 text-[14px] outline-none text-[#1f1f1f] placeholder:text-[#aaa]"
          />
          <button onClick={() => enviar()} disabled={cargando || !input.trim()}
            className="w-10 h-10 rounded-full bg-[#5a4bc3] flex items-center justify-center disabled:opacity-40 flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
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
          <TourGuide
            tourKey="ia"
            steps={[
              {
                target: 'preguntas',
                title: '💡 Preguntas sugeridas',
                message: 'Toca cualquiera de estas preguntas para empezar. Están pensadas para sacarle el máximo provecho a tu asesor.',
                position: 'bottom'
              },
              {
                target: 'input-ia',
                title: '🤖 Tu asesor financiero',
                message: 'Escribe cualquier pregunta sobre tus finanzas. Conoce tus gastos y te da consejos personalizados.',
                position: 'top'
              }
            ]}
          />
        </div>
      </div>
    </div>
  )
}