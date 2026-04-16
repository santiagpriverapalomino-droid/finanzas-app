'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

const FIXED_CATEGORIES = ['Alimentación', 'Transporte', 'Entretenimiento', 'Compras']
const CATEGORY_COLORS: Record<string, string> = {
  'Alimentación': '#5b4bc4',
  'Transporte': '#1fa18b',
  'Entretenimiento': '#f1a22e',
  'Compras': '#db6334',
}
const EXTRA_COLORS = ['#9333ea','#2563eb','#16a34a','#ca8a04','#dc2626','#db2777']

const getCategoryColor = (cat: string, custom: string[] = []) => {
  if (CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat]
  const i = custom.indexOf(cat)
  return i >= 0 ? EXTRA_COLORS[i % EXTRA_COLORS.length] : '#94a3b8'
}

const fmt = (v: number) => `S/${Math.abs(v).toLocaleString('es-PE', {minimumFractionDigits:0,maximumFractionDigits:0})}`

const NO_DATA_TIPS = [
  'La regla 50/30/20: destina 50% a necesidades, 30% a gustos y 20% a ahorro cada mes.',
  'Anota cada gasto del día, por pequeño que sea. Los gastos hormiga suman más de lo que crees.',
  'Antes de comprar algo mayor a S/50, espera 48 horas. Si aún lo necesitas, cómpralo.',
  'Tener un fondo de emergencia de 3 meses de gastos te protege de cualquier imprevisto.',
  'Paga primero tu ahorro al inicio del mes, no al final con lo que sobra.',
  'Compara precios en al menos 2 lugares antes de comprar. Puedes ahorrar hasta 30%.',
  'Cocinar en casa 3 días más por semana puede ahorrarte S/150 al mes en delivery.',
  'Cancela suscripciones que no usas. Revisa tus gastos fijos cada mes.',
  'Invertir S/50 al mes desde los 20 años puede convertirse en miles a los 40.',
  'Define una meta de ahorro con fecha límite. Las metas sin fecha raramente se cumplen.',
]

interface Expense { id: string; amount: number; category: string; description: string; date: string }
interface Goal { id: string; name: string; target_amount: number; saved_amount: number }
interface Profile {
  monthly_income: number; salary_day: number; is_first_salary_mode: boolean
  needs_percent: number; wants_percent: number; savings_percent: number; custom_categories: string[]
}

function DonutChart({ expenses, customCats }: { expenses: Expense[], customCats: string[] }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const total = expenses.reduce((s,e) => s + Number(e.amount), 0)

  const segments = useMemo(() => {
    const map: Record<string,number> = {}
    expenses.forEach(e => { map[e.category] = (map[e.category]||0) + Number(e.amount) })
    return Object.entries(map).filter(([,v])=>v>0).map(([cat,val]) => ({
      cat, val, color: getCategoryColor(cat, customCats), pct: val/total*100
    }))
  }, [expenses, total, customCats])

  if (total === 0) return (
    <div className="rounded-[22px] border border-[#ebe6db] bg-[#fcfbf8] p-4">
      <div className="flex flex-col items-center py-4">
        <svg viewBox="0 0 120 120" width="110" height="110">
          <circle cx="60" cy="60" r="45" fill="none" stroke="#e5e0d5" strokeWidth="18"/>
          <text x="60" y="64" textAnchor="middle" fontSize="11" fill="#8c887d">Sin gastos</text>
        </svg>
      </div>
    </div>
  )

  const r = 45, cx2 = 60, cy2 = 60, circ = 2*Math.PI*r
  let offset = 0
  const slices = segments.map(s => {
    const dash = s.pct/100*circ
    const sl = {...s, dash, gap:circ-dash, offset}
    offset += dash
    return sl
  })
  const hov = hovered ? segments.find(s=>s.cat===hovered) : null

  return (
    <div className="rounded-[22px] border border-[#ebe6db] bg-[#fcfbf8] p-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <svg viewBox="0 0 120 120" width="120" height="120" style={{transform:'rotate(-90deg)'}}>
            {slices.map(s => (
              <circle key={s.cat} cx={cx2} cy={cy2} r={r} fill="none"
                stroke={s.color} strokeWidth="18"
                strokeDasharray={`${s.dash} ${s.gap}`}
                strokeDashoffset={-s.offset}
                style={{transition:'opacity 0.2s', opacity: hovered && hovered!==s.cat ? 0.4 : 1}}
                onMouseEnter={()=>setHovered(s.cat)} onMouseLeave={()=>setHovered(null)}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[11px] font-bold text-[#726d62]">{hov?hov.cat.slice(0,6):'Total'}</p>
            <p className="text-[13px] font-bold text-[#1f1f1f]">{hov?fmt(hov.val):fmt(total)}</p>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          {segments.map(s => (
            <div key={s.cat} className="flex items-center justify-between cursor-pointer"
              onMouseEnter={()=>setHovered(s.cat)} onMouseLeave={()=>setHovered(null)}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:s.color}}/>
                <span className="text-[12px] text-[#403c37] truncate max-w-[70px]">{s.cat}</span>
              </div>
              <span className="text-[12px] font-semibold text-[#1f1f1f]">{fmt(s.val)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      // Verificar onboarding
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof?.monthly_income || !prof?.salary_day) {
        router.push('/onboarding'); return
      }

      setUser(user)
      setProfile(prof)

      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const { data: exp } = await supabase.from('expenses').select('*').eq('user_id', user.id).gte('date', firstDay).order('date', {ascending:false})
      setExpenses(exp || [])

      const { data: g } = await supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', {ascending:true})
      setGoals(g || [])

      setLoading(false)
    }
    init()
  }, [])

  const totalGastado = useMemo(() => expenses.reduce((s,e)=>s+Number(e.amount),0), [expenses])
  const disponible = (profile?.monthly_income||0) - totalGastado
  const activeGoal = goals[0] || null
  const goalPct = activeGoal ? Math.min(100,Math.round(activeGoal.saved_amount/activeGoal.target_amount*100)) : 0
  const customCats: string[] = profile?.custom_categories || []

  const daysUntilSalary = useMemo(() => {
    if (!profile?.salary_day) return 0
    const now = new Date()
    const sal = new Date(now.getFullYear(), now.getMonth(), profile.salary_day)
    if (sal <= now) sal.setMonth(sal.getMonth()+1)
    return Math.ceil((sal.getTime()-now.getTime())/(1000*60*60*24))
  }, [profile])

  const tipIndex = new Date().getDate() % NO_DATA_TIPS.length
  const tip1 = NO_DATA_TIPS[tipIndex]
  const tip2 = NO_DATA_TIPS[(tipIndex+1) % NO_DATA_TIPS.length]

  const spendingRatio = profile?.monthly_income ? totalGastado/profile.monthly_income : 0

  const orderedCategories = useMemo(() => {
    const allCats = [...FIXED_CATEGORIES, ...customCats]
    const map: Record<string,number> = {}
    expenses.forEach(e => { map[e.category]=(map[e.category]||0)+Number(e.amount) })
    return allCats.map(cat=>({cat, amount:map[cat]||0}))
  }, [expenses, customCats])

  const highestCat = Math.max(...orderedCategories.map(c=>c.amount),1)

  // Semana actual
  const weekData = useMemo(() => {
    const now = new Date()
    const dow = now.getDay()===0?6:now.getDay()-1
    return ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((day,i)=>{
      const t = new Date(now)
      t.setDate(now.getDate()-dow+i)
      const dateStr = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`
      const total = expenses.filter(e=>e.date===dateStr).reduce((s,e)=>s+Number(e.amount),0)
      return {day, total, isToday:i===dow}
    })
  }, [expenses])
  const maxWeek = Math.max(...weekData.map(d=>d.total),1)
  const weekTotal = weekData.reduce((s,d)=>s+d.total,0)

  // Primer sueldo
  const isFirstSalary = profile?.is_first_salary_mode
  const needsPct = profile?.needs_percent||50
  const wantsPct = profile?.wants_percent||30
  const savingsPct = profile?.savings_percent||20
  const income = profile?.monthly_income||0

  const needsSpent = useMemo(()=>expenses.filter(e=>['Alimentación','Transporte'].includes(e.category)).reduce((s,e)=>s+Number(e.amount),0),[expenses])
  const wantsSpent = useMemo(()=>expenses.filter(e=>['Entretenimiento','Compras'].includes(e.category)).reduce((s,e)=>s+Number(e.amount),0),[expenses])

  if (loading) return <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center"><p className="text-[#8c887d]">Cargando...</p></div>

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || ''

  return (
    <div className="min-h-screen bg-[#f5f3ee]">
      {/* Header */}
      <div className="px-4 pt-5 pb-2 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-[#8c887d] uppercase">{firstName}</p>
          <p className="text-[13px] font-bold tracking-widest text-[#1f1f1f] uppercase">Inicio / Dashboard</p>
        </div>
        <div className="flex gap-2">
          <Link href="/configuracion" className="w-9 h-9 rounded-full bg-[#ece8df] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5a4bc3" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </Link>
          <button onClick={async()=>{await supabase.auth.signOut();router.push('/')}} className="w-9 h-9 rounded-full bg-[#ece8df] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5a4bc3" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>

      <div className="px-4 pb-24 space-y-4 mt-1">

        {/* Fecha */}
        <p className="text-[13px] text-[#5d594f]">
          {new Date().toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).replace(/^\w/,c=>c.toUpperCase())} · {daysUntilSalary}d para cobro
        </p>

        {/* Banner primer sueldo */}
        {isFirstSalary && (
          <div className="flex items-center gap-3 rounded-[16px] border border-[#c8bbf5] bg-[#ede9ff] px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-[#5a4bc3] flex items-center justify-center text-white text-sm">⚡</div>
            <div>
              <p className="text-[13px] font-bold text-[#3d2fa0]">Tu plan {needsPct}/{wantsPct}/{savingsPct} está activo</p>
              <p className="text-[12px] text-[#6b5fc0]">Necesidades · Gustos · Ahorro</p>
            </div>
          </div>
        )}

        {/* Alertas */}
        {spendingRatio > 0.8 && (
          <div className="flex items-center gap-3 rounded-[18px] border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
            ⚠️ <span>¡Cuidado! Has gastado más del 80% de tu presupuesto este mes.</span>
          </div>
        )}
        {spendingRatio > 0.6 && spendingRatio <= 0.8 && (
          <div className="flex items-center gap-3 rounded-[18px] border border-yellow-200 bg-yellow-50 p-4 text-[13px] text-yellow-700">
            ⚠️ <span>Atención: Has superado el 60% de tus ingresos este mes.</span>
          </div>
        )}

        {/* Cards resumen */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {title:'Gastado este mes', value:fmt(totalGastado), color:'text-[#b24f58]'},
            {title:'Disponible', value:fmt(disponible), color:'text-[#457d31]'},
            {title:'Meta activa', value:activeGoal?.name||'Sin meta', color:'text-[#1f1f1f]'},
            {title:'Progreso', value:activeGoal?`${goalPct}%`:'0%', color:'text-[#1f1f1f]'},
          ].map(card=>(
            <div key={card.title} className="rounded-[18px] bg-[#f3f0e8] p-4">
              <p className="text-[13px] text-[#4d4a43]">{card.title}</p>
              <p className={`mt-1 text-[17px] font-semibold ${card.color} truncate`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Donut chart */}
        <DonutChart expenses={expenses} customCats={customCats} />

        {/* Esta semana */}
        <div className="rounded-[22px] border border-[#ebe6db] bg-[#fcfbf8] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-[#47433d]">Esta Semana</h2>
            <span className="text-[13px] font-bold text-[#b24f58]">{fmt(weekTotal)}</span>
          </div>
          <div className="flex items-end gap-1 mb-2" style={{height:'48px'}}>
            {weekData.map(d=>{
              const h = d.total>0?Math.max(6,(d.total/maxWeek)*44):2
              return (
                <div key={d.day} className="flex-1 flex items-end">
                  <div className="w-full rounded-t-sm" style={{height:`${h}px`,background:d.isToday?'#5a4bc3':'#c8bbf5',opacity:d.total===0?0.3:1}}/>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between">
            {weekData.map(d=>(
              <div key={d.day} className="flex-1 flex flex-col items-center">
                <p className={`text-[10px] ${d.isToday?'text-[#5a4bc3] font-bold':'text-[#8c887d]'}`}>{d.day}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mi plan este mes */}
        {false && income > 0 && (
          <div className="rounded-[22px] border border-[#c8bbf5] bg-[#faf9ff] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span>📅</span>
                <h2 className="text-[13px] font-bold uppercase tracking-wide text-[#3d2fa0]">Mi Plan Este Mes</h2>
              </div>
              <span className="text-[12px] bg-[#ede9ff] text-[#5a4bc3] px-3 py-1 rounded-full">{daysUntilSalary}d para cobro</span>
            </div>
            {[
              {label:'Necesidades',icon:'🍽️',limit:Math.round(income*needsPct/100),spent:needsSpent},
              {label:'Gustos',icon:'🛍️',limit:Math.round(income*wantsPct/100),spent:wantsSpent},
            ].map(item=>{
              const pct = item.limit>0?Math.min(100,(item.spent/item.limit)*100):0
              return (
                <div key={item.label} className="mb-3 bg-white rounded-[14px] p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{item.icon}</span>
                      <span className="text-[14px] font-semibold text-[#3d2fa0]">{item.label}</span>
                    </div>
                    <span className="text-[13px] font-bold text-[#22c55e]">Disp: {fmt(item.limit-item.spent)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#ece8f0] mb-1">
                    <div className="h-2 rounded-full bg-[#22c55e] transition-all" style={{width:`${pct}%`}}/>
                  </div>
                  <div className="flex justify-between text-[12px] text-[#8c887d]">
                    <span>Gastado: {fmt(item.spent)}</span>
                    <span>Límite: {fmt(item.limit)}</span>
                  </div>
                </div>
              )
            })}
            <div className="bg-white rounded-[14px] p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>🐷</span>
                  <span className="text-[14px] font-semibold text-[#3d2fa0]">Ahorro</span>
                </div>
                <span className="text-[13px] font-bold text-[#5a4bc3]">Meta: {fmt(Math.round(income*savingsPct/100))}/mes</span>
              </div>
              <p className="text-[12px] text-[#8c887d] mt-1">Separa {fmt(Math.round(income*savingsPct/100))} este mes para tu meta de ahorro</p>
            </div>
          </div>
        )}

        {/* Resumen + Mejora */}
        <div className="rounded-[22px] border border-[#ebe6db] bg-[#fcfbf8] p-4">
          <div className="flex items-center gap-2 mb-3">
            <span>💼</span>
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-[#47433d]">Resumen + Mejora</h2>
          </div>
          <div className="rounded-[18px] bg-[#f4efe3] p-4">
            <p className="text-[14px] font-semibold text-[#624b20]">Consejo de la IA</p>
            <p className="mt-1 text-[13px] leading-5 text-[#5b564d]">{tip1}</p>
          </div>
        </div>

        {/* Gastos por categoría */}
        <div className="rounded-[22px] border border-[#ebe6db] bg-[#fcfbf8] p-4">
          <div className="flex items-center gap-2 mb-3">
            <span>📉</span>
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-[#47433d]">Gastos por categoría</h2>
          </div>
          <div className="space-y-3">
            {orderedCategories.map(({cat,amount})=>{
              const width = amount>0?Math.max(8,(amount/highestCat)*100):8
              return (
                <div key={cat}>
                  <div className="flex justify-between text-[14px] mb-1">
                    <span className="text-[#403c37]">{cat}</span>
                    <span className="font-medium text-[#2f2d29]">{fmt(amount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#ece7dd]">
                    <div className="h-2 rounded-full transition-all" style={{width:`${width}%`,backgroundColor:amount>0?getCategoryColor(cat,customCats):'#d7d2c7'}}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Consejo IA */}
        <div className="rounded-[22px] border border-[#cfe5df] bg-[#dbefea] p-4">
          <div className="flex items-center gap-2 mb-2 text-[#2b5d58]">
            <span>💡</span>
            <h2 className="text-[14px] font-bold">Consejo de la IA</h2>
          </div>
          <p className="text-[14px] leading-6 text-[#24514c]">{tip2}</p>
          {activeGoal && (
            <div className="mt-3 flex items-center justify-between rounded-[18px] bg-white/65 px-4 py-3 text-[13px] text-[#375d56]">
              <span>🎯 {activeGoal.name}</span>
              <span className="font-semibold">✨ {goalPct}%</span>
            </div>
          )}
        </div>

      </div>

      {/* Navbar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#ece8df]">
        <div className="max-w-md mx-auto flex">
          {[
            {href:'/dashboard',label:'Inicio',active:true,icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>},
            {href:'/gastos',label:'Gastos',active:false,icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>},
            {href:'/metas',label:'Metas',active:false,icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>},
            {href:'/inversiones',label:'Inversiones',active:false,icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>},
          ].map((item:any)=>(
            <Link key={item.href} href={item.href} className={`flex-1 flex flex-col items-center py-3 gap-1 ${item.active?'text-[#5a4bc3]':'text-[#8c887d]'}`}>
              {item.icon}
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Burbuja IA */}
      <Link href="/ia" className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-[#5a4bc3] flex items-center justify-center shadow-lg">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </Link>
    </div>
  )
}
