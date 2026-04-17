'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { useCurrency } from '../../lib/currencycontext'
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

const getBorderColor = (cat: string) => {
  switch(cat) {
    case 'Alimentación': return 'border-l-[#5a4bc3]'
    case 'Transporte': return 'border-l-[#10b981]'
    case 'Entretenimiento': return 'border-l-[#f59e0b]'
    case 'Compras': return 'border-l-[#3b82f6]'
    default: return 'border-l-[#94a3b8]'
  }
}

const todayStr = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
}

interface Expense { id: string; description: string; amount: number; category: string; date: string; currency?: string }
interface FixedExpense { id: string; name: string; amount: number; day_of_month: number; category: string; active: boolean }

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
  </svg>
)

function DonutChart({ expenses, customCats }: { expenses: Expense[], customCats: string[] }) {
  const { fmt, symbol } = useCurrency()
  const penExpenses = expenses.filter(e => !e.currency || e.currency === 'PEN')
  const total = penExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const [hovered, setHovered] = useState<string | null>(null)

  const segments = useMemo(() => {
    const map: Record<string, number> = {}
    penExpenses.forEach(e => { map[e.category] = (map[e.category] || 0) + Number(e.amount) })
    return Object.entries(map).filter(([,v]) => v > 0).map(([cat, val]) => ({
      cat, val, color: getCategoryColor(cat, customCats), pct: val / total * 100
    }))
  }, [expenses, total, customCats])

  if (total === 0) return (
    <div className="rounded-[22px] border border-[#ebe6db] bg-[#fcfbf8] p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#726d62] mb-3">Distribución de gastos</p>
      <div className="flex flex-col items-center py-6">
        <svg viewBox="0 0 120 120" width="120" height="120">
          <circle cx="60" cy="60" r="45" fill="none" stroke="#e5e0d5" strokeWidth="18"/>
        </svg>
        <p className="text-[13px] text-[#8c887d] mt-2">Sin gastos aún</p>
      </div>
    </div>
  )

  const r = 45, cx = 60, cy = 60, circ = 2 * Math.PI * r
  let offset = 0
  const slices = segments.map(s => {
    const dash = (s.pct / 100) * circ
    const gap = circ - dash
    const slice = { ...s, dash, gap, offset }
    offset += dash
    return slice
  })

  const hov = hovered ? segments.find(s => s.cat === hovered) : null

  return (
    <div className="rounded-[22px] border border-[#ebe6db] bg-[#fcfbf8] p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#726d62] mb-3">Distribución de gastos (S/)</p>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <svg viewBox="0 0 120 120" width="120" height="120" style={{transform:'rotate(-90deg)'}}>
            {slices.map(s => (
              <circle key={s.cat} cx={cx} cy={cy} r={r} fill="none"
                stroke={s.color} strokeWidth="18"
                strokeDasharray={`${s.dash} ${s.gap}`}
                strokeDashoffset={-s.offset}
                style={{transition:'opacity 0.2s', opacity: hovered && hovered !== s.cat ? 0.4 : 1}}
                onMouseEnter={() => setHovered(s.cat)} onMouseLeave={() => setHovered(null)}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[11px] font-bold text-[#726d62]">{hov ? hov.cat.slice(0,6) : 'Total'}</p>
            <p className="text-[14px] font-bold text-[#1f1f1f]">{hov ? fmt(hov.val) : fmt(total)}</p>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {segments.map(s => (
            <div key={s.cat} className="flex items-center justify-between cursor-pointer"
              onMouseEnter={() => setHovered(s.cat)} onMouseLeave={() => setHovered(null)}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background: s.color}}/>
                <span className="text-[12px] text-[#403c37] truncate max-w-[80px]">{s.cat}</span>
              </div>
              <span className="text-[12px] font-semibold text-[#1f1f1f]">{fmt(s.val)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function WeeklyBars({ expenses, profile, onDelete }: { expenses: Expense[], profile: any, onDelete: (id: string) => void }) {
  const { fmt } = useCurrency()
  const fmtUSD = (v: number) => `$${Math.abs(v).toLocaleString('en-US', {minimumFractionDigits:0,maximumFractionDigits:2})}`
  const fmtAmount = (e: Expense) => e.currency === 'USD' ? fmtUSD(Number(e.amount)) : fmt(Number(e.amount))
  const days = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
  const now = new Date()
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1

  const weekData = days.map((day, i) => {
    const target = new Date(now)
    target.setDate(now.getDate() - dayOfWeek + i)
    const dateStr = `${target.getFullYear()}-${String(target.getMonth()+1).padStart(2,'0')}-${String(target.getDate()).padStart(2,'0')}`
    const total = expenses.filter(e => e.date === dateStr && (!e.currency || e.currency === 'PEN')).reduce((s,e) => s + Number(e.amount), 0)
    return { day, dateStr, total, isToday: i === dayOfWeek, dayNum: target.getDate() }
  })

  const maxVal = Math.max(...weekData.map(d => d.total), 1)
  const weekTotal = weekData.reduce((s,d) => s + d.total, 0)
  const avgPerDay = weekTotal / 7

  const daysUntilSalary = profile?.salary_day ? (() => {
    const sal = new Date(now.getFullYear(), now.getMonth(), profile.salary_day)
    if (sal <= now) sal.setMonth(sal.getMonth() + 1)
    return Math.ceil((sal.getTime() - now.getTime()) / (1000*60*60*24))
  })() : 0

  const weekExpenses = expenses.filter(e => {
    const start = new Date(now)
    start.setDate(now.getDate() - dayOfWeek)
    start.setHours(0,0,0,0)
    const startStr = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`
    return e.date >= startStr
  })

  return (
    <div className="space-y-3">
      <div className="rounded-[22px] border border-[#ebe6db] bg-[#fcfbf8] p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#726d62]">Esta semana</p>
            <p className="text-[22px] font-bold text-[#b24f58] leading-none">{fmt(weekTotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-[#726d62]">Promedio/día</p>
            <p className="text-[14px] font-semibold text-[#5a4bc3]">{fmt(avgPerDay)}</p>
          </div>
        </div>
        <div className="flex items-end justify-between gap-1 mb-2" style={{height:'52px'}}>
          {weekData.map(d => {
            const h = d.total > 0 ? Math.max(8, (d.total / maxVal) * 52) : 2
            return (
              <div key={d.day} className="flex-1 flex items-end">
                <div className="w-full rounded-t-md transition-all"
                  style={{height:`${h}px`, background: d.isToday ? '#5a4bc3' : '#c8bbf5', opacity: d.total === 0 ? 0.3 : 1}}/>
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mb-3">
          {weekData.map(d => (
            <div key={d.day} className="flex-1 flex flex-col items-center">
              <p className={`text-[10px] font-medium ${d.isToday ? 'text-[#5a4bc3] font-bold' : 'text-[#8c887d]'}`}>{d.day}</p>
              <p className={`text-[10px] ${d.isToday ? 'text-[#5a4bc3] font-bold' : 'text-[#aaa]'}`}>{d.dayNum}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-[#ebe6db]">
          <p className="text-[12px] text-[#8c887d]">Sin datos de semana anterior</p>
          {daysUntilSalary > 0 && (
            <span className="text-[11px] font-bold text-[#5a4bc3] bg-[#ede9ff] px-2 py-1 rounded-full">{daysUntilSalary}d hasta cobro</span>
          )}
        </div>
      </div>
      <p className="text-[13px] font-bold text-[#47433d] uppercase tracking-wide">Gastos de la semana</p>
      {weekExpenses.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-[14px] text-[#8c887d]">Sin gastos esta semana</p>
        </div>
      ) : weekExpenses.map(e => (
        <div key={e.id} className={`flex items-center justify-between p-4 rounded-[22px] bg-[#fcfbf8] border border-[#ebe6db] border-l-4 ${getBorderColor(e.category)}`}>
          <div className="pl-1">
            <p className="text-[14px] font-semibold text-[#26231f]">{e.description}</p>
            <p className="text-[11px] text-[#8c887d]">{e.category} · {new Date(e.date + 'T12:00:00').toLocaleDateString('es-PE',{day:'numeric',month:'short'})}</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-bold text-[#b24f58]">-{fmtAmount(e)}</p>
            <button onClick={() => onDelete(e.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#9b968d] hover:text-[#b24f58]">
              <TrashIcon />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function MonthView({ expenses, customCats, onDelete }: { expenses: Expense[], customCats: string[], onDelete: (id: string) => void }) {
  const { fmt } = useCurrency()
  const fmtUSD = (v: number) => `$${Math.abs(v).toLocaleString('en-US', {minimumFractionDigits:0,maximumFractionDigits:2})}`
  const fmtAmount = (e: Expense) => e.currency === 'USD' ? fmtUSD(Number(e.amount)) : fmt(Number(e.amount))
  const now = new Date()
  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const total = monthExpenses.filter(e => !e.currency || e.currency === 'PEN').reduce((s,e) => s + Number(e.amount), 0)

  const weeks: Record<string, Expense[]> = {}
  monthExpenses.forEach(e => {
    const weekNum = Math.ceil(new Date(e.date).getDate() / 7)
    const key = `Semana ${weekNum}`
    if (!weeks[key]) weeks[key] = []
    weeks[key].push(e)
  })

  return (
    <div className="space-y-3">
      <div className="rounded-[22px] bg-[#f3f0e8] p-4 border border-[#ebe6db]">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#726d62]">
          Total gastado en {now.toLocaleDateString('es-PE',{month:'long'})}
        </p>
        <p className="mt-1 text-[24px] font-bold text-[#b24f58]">{fmt(total)}</p>
        <p className="text-[12px] text-[#8c887d]">{monthExpenses.length} transacciones</p>
      </div>
      <DonutChart expenses={monthExpenses} customCats={customCats} />
      {Object.entries(weeks).map(([week, exps]) => {
        const weekTotal = exps.filter(e => !e.currency || e.currency === 'PEN').reduce((s,e) => s + Number(e.amount), 0)
        return (
          <div key={week} className="rounded-[22px] border border-[#ebe6db] bg-[#fcfbf8] p-4">
            <div className="flex justify-between mb-2">
              <p className="text-[13px] font-bold text-[#47433d]">{week}</p>
              <p className="text-[13px] font-bold text-[#b24f58]">{fmt(weekTotal)}</p>
            </div>
            {exps.map(e => (
              <div key={e.id} className={`flex items-center justify-between py-2 border-b border-[#f0ebe0] last:border-0 pl-2 border-l-2 ${getBorderColor(e.category)}`}>
                <div>
                  <p className="text-[13px] text-[#26231f]">{e.description}</p>
                  <p className="text-[11px] text-[#8c887d]">{e.category} {e.currency === 'USD' ? '· 💵 USD' : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-[#b24f58]">-{fmtAmount(e)}</p>
                  <button onClick={() => onDelete(e.id)} className="w-7 h-7 rounded-full flex items-center justify-center text-[#9b968d] hover:text-[#b24f58]">
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export default function Gastos() {
  const router = useRouter()
  const { fmt, currency, symbol } = useCurrency()
  const fmtUSD = (v: number) => `$${Math.abs(v).toLocaleString('en-US', {minimumFractionDigits:0,maximumFractionDigits:2})}`
  const fmtAmount = (e: Expense) => e.currency === 'USD' ? fmtUSD(Number(e.amount)) : fmt(Number(e.amount))
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'month'|'week'|'all'|'fixed'>('month')
  const [isAdding, setIsAdding] = useState(false)
  const [isAddingFixed, setIsAddingFixed] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [form, setForm] = useState({ description: '', category: 'Alimentación', amount: '', date: todayStr(), currency: 'PEN' })
  const [fixedForm, setFixedForm] = useState({ name:'', amount:'', day_of_month:'1', category:'Alimentación', active:true })
  const [isImporting, setIsImporting] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanando, setScanando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [gastosImportados, setGastosImportados] = useState<any[]>([])
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set())

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: exp } = await supabase.from('expenses').select('*').eq('user_id', user.id).order('date', { ascending: false })
      setExpenses(exp || [])
      const { data: fixed } = await supabase.from('fixed_expenses').select('*').eq('user_id', user.id).order('created_at')
      setFixedExpenses(fixed || [])
      setLoading(false)
    }
    init()
  }, [])

  const customCats: string[] = profile?.custom_categories || []
  const allCats = [...FIXED_CATEGORIES, ...customCats]

  const summary = useMemo(() => {
    const now = new Date()
    const month = expenses.filter(e => {
      const d = new Date(e.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const totalPEN = month.filter(e => !e.currency || e.currency === 'PEN').reduce((s,e) => s + Number(e.amount), 0)
    const totalUSD = month.filter(e => e.currency === 'USD').reduce((s,e) => s + Number(e.amount), 0)
    const catMap: Record<string,number> = {}
    month.forEach(e => { catMap[e.category] = (catMap[e.category]||0) + Number(e.amount) })
    let top = 'Ninguna', max = 0
    Object.entries(catMap).forEach(([c,v]) => { if(v>max){max=v;top=c} })
    return { totalPEN, totalUSD, count: month.length, topCategory: top }
  }, [expenses])

  const totalFixed = useMemo(() => fixedExpenses.filter(f=>f.active).reduce((s,f)=>s+Number(f.amount),0), [fixedExpenses])

  const eliminar = async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const eliminarFijo = async (id: string) => {
    await supabase.from('fixed_expenses').delete().eq('id', id)
    setFixedExpenses(prev => prev.filter(f => f.id !== id))
  }

  const toggleFijo = async (id: string) => {
    const f = fixedExpenses.find(f => f.id === id)
    if (!f) return
    await supabase.from('fixed_expenses').update({ active: !f.active }).eq('id', id)
    setFixedExpenses(prev => prev.map(f => f.id === id ? {...f, active: !f.active} : f))
  }

  const agregarGasto = async () => {
    if (!form.description || !form.amount) return
    setGuardando(true)
    const { data, error } = await supabase.from('expenses').insert({
      user_id: user.id,
      description: form.description,
      amount: parseFloat(form.amount),
      category: form.category,
      date: form.date,
      currency: form.currency,
      is_fixed: false
    }).select()
    if (!error && data) {
      setExpenses(prev => [data[0], ...prev])
      setForm({ description:'', category:'Alimentación', amount:'', date:todayStr(), currency:'PEN' })
      setIsAdding(false)
    }
    setGuardando(false)
  }

  const agregarFijo = async () => {
    if (!fixedForm.name || !fixedForm.amount) return
    setGuardando(true)
    const { data, error } = await supabase.from('fixed_expenses').insert({
      user_id: user.id, name: fixedForm.name, amount: parseFloat(fixedForm.amount),
      day_of_month: parseInt(fixedForm.day_of_month), category: fixedForm.category, active: fixedForm.active
    }).select()
    if (!error && data) {
      setFixedExpenses(prev => [...prev, data[0]])
      setFixedForm({ name:'', amount:'', day_of_month:'1', category:'Alimentación', active:true })
      setIsAddingFixed(false)
    }
    setGuardando(false)
  }

  const agregarCat = async () => {
    if (!newCatName.trim()) return
    const newCats = [...customCats, newCatName.trim()]
    await supabase.from('profiles').update({ custom_categories: newCats }).eq('id', user.id)
    setProfile((p: any) => ({...p, custom_categories: newCats}))
    setForm(p => ({...p, category: newCatName.trim()}))
    setNewCatName(''); setShowAddCat(false)
  }

  if (loading) return <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center"><p className="text-[#8c887d]">Cargando...</p></div>

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || ''

  return (
    <div className="min-h-screen bg-[#f5f3ee]">
      <div className="px-4 pt-5 pb-2 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-[#8c887d] uppercase">{firstName}</p>
          <p className="text-[13px] font-bold tracking-widest text-[#1f1f1f] uppercase">Registro de Gastos</p>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[16px] font-bold text-[#1f1f1f]">Mis gastos</h1>
            <p className="text-[13px] text-[#5d594f]">Gestiona y visualiza todos tus movimientos</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsScanning(true)}
              className="flex items-center gap-1.5 bg-[#ede9ff] border border-[#c8bbf5] rounded-[12px] px-3 py-2 text-[12px] font-bold text-[#5a4bc3]">
              📸 Boleta
            </button>
            <button onClick={() => setIsImporting(true)}
              className="flex items-center gap-1.5 bg-[#ede9ff] border border-[#c8bbf5] rounded-[12px] px-3 py-2 text-[12px] font-bold text-[#5a4bc3]">
              📄 Banco
            </button>
          </div>
        </div>

        {/* Cards resumen */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-[22px] bg-[#f3f0e8] p-4 border border-[#ebe6db]">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#726d62]">Total gastado este mes</p>
            <p className="mt-1 text-[24px] font-bold text-[#b24f58]">{fmt(summary.totalPEN)}</p>
            {summary.totalUSD > 0 && (
              <p className="text-[14px] font-bold text-[#1fa18b] mt-1">{fmtUSD(summary.totalUSD)} USD</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:col-span-2">
            <div className="rounded-[22px] bg-[#f3f0e8] p-4 border border-[#ebe6db]">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#726d62]">Transacciones</p>
              <p className="mt-1 text-[18px] font-semibold text-[#24211d]">{summary.count}</p>
            </div>
            <div className="rounded-[22px] bg-[#f3f0e8] p-4 border border-[#ebe6db]">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#726d62]">Mayor gasto</p>
              <p className="mt-1 text-[18px] font-semibold text-[#5a4bc3] truncate">{summary.topCategory}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-[#f3f0e8] rounded-2xl border border-[#ebe6db]">
          {[{id:'all',label:'Todos'},{id:'month',label:'Mes'},{id:'week',label:'Semana'},{id:'fixed',label:'Fijos'}].map(btn => (
            <button key={btn.id} onClick={() => setFilter(btn.id as any)}
              className={`flex-1 px-2 py-1.5 rounded-xl text-[12px] font-medium transition-all ${filter===btn.id?'bg-white text-[#5a4bc3] shadow-sm':'text-[#726d62]'}`}>
              {btn.label}
            </button>
          ))}
        </div>

        {filter === 'month' && <MonthView expenses={expenses} customCats={customCats} onDelete={eliminar} />}
        {filter === 'week' && <WeeklyBars expenses={expenses} profile={profile} onDelete={eliminar} />}

        {filter === 'all' && (
          <div className="space-y-2">
            {expenses.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[15px] font-medium text-[#26231f]">Sin gastos registrados</p>
              </div>
            ) : expenses.map(e => (
              <div key={e.id} className={`flex items-center justify-between p-4 rounded-[22px] bg-[#fcfbf8] border border-[#ebe6db] border-l-4 ${getBorderColor(e.category)}`}>
                <div className="pl-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#26231f] truncate">{e.description}</p>
                  <p className="text-[12px] text-[#6b6559]">{e.category} {e.currency === 'USD' ? '· 💵 USD' : ''} · {new Date(e.date + 'T12:00:00').toLocaleDateString('es-PE',{day:'numeric',month:'short',year:'numeric'})}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-bold text-[#b24f58]">-{fmtAmount(e)}</p>
                  <button onClick={() => eliminar(e.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#9b968d] hover:text-[#b24f58]">
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filter === 'fixed' && (
          <div className="space-y-3">
            <div className="rounded-[22px] bg-[#f3f0e8] p-4 border border-[#ebe6db]">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#726d62]">Total gastos fijos mensuales</p>
              <p className="mt-1 text-[24px] font-bold text-[#5a4bc3]">{fmt(totalFixed)}</p>
            </div>
            {fixedExpenses.length === 0 ? (
              <div className="py-12 flex flex-col items-center text-center">
                <div className="h-16 w-16 bg-[#f3f0e8] rounded-full flex items-center justify-center mb-4 text-2xl">📌</div>
                <p className="text-[15px] font-medium text-[#26231f]">No tienes gastos fijos</p>
                <p className="mt-1 text-[13px] text-[#6b6559]">Agrega gastos como suscripciones o alquiler.</p>
              </div>
            ) : fixedExpenses.map(f => (
              <div key={f.id} className={`flex items-center justify-between gap-3 p-4 rounded-[22px] bg-[#fcfbf8] border border-[#ebe6db] border-l-4 ${getBorderColor(f.category)}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-bold text-[#26231f] truncate">{f.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${f.active?'bg-[#e0f2fe] text-[#0369a1]':'bg-[#f1f5f9] text-[#64748b]'}`}>
                      {f.active?'Activo':'Inactivo'}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#6b6559]">{f.category} · Día {f.day_of_month}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-bold text-[#24211d]">{fmt(f.amount)}</p>
                  <button onClick={() => toggleFijo(f.id)} className={`w-8 h-8 rounded-full flex items-center justify-center ${f.active?'bg-[#e0f2fe] text-[#0369a1]':'bg-[#f1f5f9] text-[#64748b]'}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  </button>
                  <button onClick={() => eliminarFijo(f.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#9b968d] hover:text-[#b24f58]">
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => filter==='fixed' ? setIsAddingFixed(true) : setIsAdding(true)}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-[#5a4bc3] text-white flex items-center justify-center shadow-lg">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>

      {isScanning && (
        <div className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm" onClick={() => setIsScanning(false)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-[34px] bg-[#fcfbf8] p-5 pb-8" onClick={e => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[#ddd7cc]"/>
            <h2 className="text-[18px] font-semibold text-[#24211d] mb-1">Escanear boleta</h2>
            <p className="text-[13px] text-[#8c887d] mb-4">Saca foto a tu boleta o ticket y la IA extrae el gasto automáticamente.</p>
            <label className={`flex flex-col items-center justify-center w-full h-36 rounded-[18px] border-2 border-dashed border-[#c8bbf5] bg-[#faf9ff] cursor-pointer ${scanando ? 'opacity-50' : 'hover:bg-[#ede9ff]'} transition-colors`}>
              <input type="file" accept="image/*" capture="environment" className="hidden" disabled={scanando}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setScanando(true)
                  try {
                    const fd = new FormData()
                    fd.append('file', file)
                    const res = await fetch('/api/escanear', { method: 'POST', body: fd })
                    const data = await res.json()
                    if (data.gasto) {
                      setForm({
                        description: data.gasto.descripcion,
                        category: data.gasto.categoria,
                        amount: String(data.gasto.monto),
                        date: todayStr(),
                        currency: 'PEN'
                      })
                      setIsScanning(false)
                      setIsAdding(true)
                    } else {
                      alert('No se pudo leer la boleta. Intenta con una foto más clara.')
                    }
                  } catch {
                    alert('Error al procesar la imagen.')
                  }
                  setScanando(false)
                }}
              />
              {scanando ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-4 border-[#5a4bc3] border-t-transparent rounded-full animate-spin"/>
                  <p className="text-[13px] text-[#5a4bc3] font-medium">Analizando boleta...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-4xl">📸</span>
                  <p className="text-[14px] font-medium text-[#5a4bc3]">Toca para abrir cámara</p>
                  <p className="text-[12px] text-[#8c887d]">O selecciona una foto de tu galería</p>
                </div>
              )}
            </label>
            <div className="rounded-[14px] bg-[#f0fdf4] border border-[#bbf7d0] p-3 mt-4">
              <p className="text-[12px] text-[#166534]">✓ Funciona con boletas, tickets, recibos y capturas de pantalla de pagos</p>
            </div>
          </div>
        </div>
      )}

      {isImporting && (
        <div className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm" onClick={() => { setIsImporting(false); setGastosImportados([]); setSeleccionados(new Set()) }}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-[34px] bg-[#fcfbf8] p-5 pb-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[#ddd7cc]"/>
            <h2 className="text-[18px] font-semibold text-[#24211d] mb-1">Importar desde banco</h2>
            <p className="text-[13px] text-[#8c887d] mb-4">Sube tu estado de cuenta (PDF o imagen) y la IA extrae los gastos automáticamente.</p>
            {gastosImportados.length === 0 ? (
              <div className="space-y-4">
                <label className={`flex flex-col items-center justify-center w-full h-36 rounded-[18px] border-2 border-dashed border-[#c8bbf5] bg-[#faf9ff] cursor-pointer ${importando ? 'opacity-50' : 'hover:bg-[#ede9ff]'} transition-colors`}>
                  <input type="file" accept="image/*,application/pdf" className="hidden" disabled={importando}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setImportando(true)
                      try {
                        const fd = new FormData()
                        fd.append('file', file)
                        const res = await fetch('/api/importar', { method: 'POST', body: fd })
                        const data = await res.json()
                        if (data.gastos && data.gastos.length > 0) {
                          setGastosImportados(data.gastos)
                          setSeleccionados(new Set(data.gastos.map((_: any, i: number) => i)))
                        } else {
                          alert('No se encontraron gastos en el archivo.')
                        }
                      } catch {
                        alert('Error al procesar el archivo.')
                      }
                      setImportando(false)
                    }}
                  />
                  {importando ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-[#5a4bc3] border-t-transparent rounded-full animate-spin"/>
                      <p className="text-[13px] text-[#5a4bc3] font-medium">Analizando con IA...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">📄</span>
                      <p className="text-[14px] font-medium text-[#5a4bc3]">Toca para subir archivo</p>
                      <p className="text-[12px] text-[#8c887d]">PDF o imagen de estado de cuenta</p>
                    </div>
                  )}
                </label>
                <div className="rounded-[14px] bg-[#f0fdf4] border border-[#bbf7d0] p-3">
                  <p className="text-[12px] text-[#166534]">✓ Compatible con BCP, BBVA, Interbank, Scotiabank y capturas de Yape</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[14px] font-bold text-[#1f1f1f]">{gastosImportados.length} gastos detectados</p>
                  <button onClick={() => {
                    if (seleccionados.size === gastosImportados.length) {
                      setSeleccionados(new Set())
                    } else {
                      setSeleccionados(new Set(gastosImportados.map((_,i)=>i)))
                    }
                  }} className="text-[12px] font-bold text-[#5a4bc3]">
                    {seleccionados.size === gastosImportados.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                </div>
                {gastosImportados.map((g, i) => (
                  <div key={i} onClick={() => {
                    const next = new Set(seleccionados)
                    if (next.has(i)) next.delete(i)
                    else next.add(i)
                    setSeleccionados(next)
                  }} className={`flex items-center gap-3 p-3 rounded-[16px] border cursor-pointer transition-all ${seleccionados.has(i) ? 'border-[#5a4bc3] bg-[#ede9ff]' : 'border-[#ebe6db] bg-white'}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${seleccionados.has(i) ? 'border-[#5a4bc3] bg-[#5a4bc3]' : 'border-[#ddd7cc]'}`}>
                      {seleccionados.has(i) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#1f1f1f] truncate">{g.descripcion}</p>
                      <p className="text-[11px] text-[#8c887d]">{g.categoria} · {new Date(g.fecha + 'T12:00:00').toLocaleDateString('es-PE',{day:'numeric',month:'short',year:'numeric'})}</p>
                    </div>
                    <p className="text-[14px] font-bold text-[#b24f58] flex-shrink-0">-S/{g.monto}</p>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button onClick={() => { setGastosImportados([]); setSeleccionados(new Set()) }}
                    className="rounded-[14px] border border-[#e2decb] py-3 text-[14px] text-[#8c887d]">
                    Volver
                  </button>
                  <button disabled={seleccionados.size === 0 || guardando}
                    onClick={async () => {
                      setGuardando(true)
                      const selArray = Array.from(seleccionados).map(i => gastosImportados[i])
                      for (const g of selArray) {
                        await supabase.from('expenses').insert({
                          user_id: user.id,
                          description: g.descripcion,
                          amount: g.monto,
                          category: g.categoria,
                          date: g.fecha,
                          currency: 'PEN',
                          is_fixed: false
                        })
                      }
                      const { data: exp } = await supabase.from('expenses').select('*').eq('user_id', user.id).order('date', { ascending: false })
                      setExpenses(exp || [])
                      setGastosImportados([])
                      setSeleccionados(new Set())
                      setIsImporting(false)
                      setGuardando(false)
                    }}
                    className="rounded-[14px] bg-[#5a4bc3] py-3 text-[14px] font-bold text-white disabled:opacity-40">
                    {guardando ? 'Guardando...' : `Importar ${seleccionados.size}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm" onClick={() => setIsAdding(false)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-[34px] bg-[#fcfbf8] p-5 pb-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[#ddd7cc]"/>
            <h2 className="text-[18px] font-semibold text-[#24211d] mb-4">Nuevo gasto</h2>
            <div className="space-y-3">
              <input type="text" placeholder="¿En qué gastaste?" value={form.description}
                onChange={e => setForm(p=>({...p,description:e.target.value}))}
                className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff]"/>
              <div className="grid grid-cols-2 gap-3">
                <select value={form.category} onChange={e => {
                  if (e.target.value==='ADD_NEW'){setShowAddCat(true)}
                  else{setForm(p=>({...p,category:e.target.value}));setShowAddCat(false)}
                }} className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none">
                  {allCats.map(c=><option key={c} value={c}>{c}</option>)}
                  <option value="ADD_NEW">+ Nueva categoría</option>
                </select>
                <div className="flex gap-2">
                  <select value={form.currency} onChange={e => setForm(p=>({...p,currency:e.target.value}))}
                    className="rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-3 py-3 outline-none font-bold text-[#5a4bc3]">
                    <option value="PEN">S/</option>
                    <option value="USD">$</option>
                  </select>
                  <input type="number" placeholder="Monto" value={form.amount}
                    onChange={e => setForm(p=>({...p,amount:e.target.value}))}
                    className="flex-1 rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff]"/>
                </div>
              </div>
              {showAddCat && (
                <div className="flex gap-2">
                  <input type="text" placeholder="Nueva categoría" value={newCatName}
                    onChange={e=>setNewCatName(e.target.value)}
                    className="flex-1 rounded-[15px] border border-[#e5dfd5] bg-[#f7f4ed] px-3 py-2 text-[14px] outline-none"/>
                  <button onClick={agregarCat} className="rounded-[15px] bg-[#5a4bc3] px-4 py-2 text-[13px] font-semibold text-white">Guardar</button>
                </div>
              )}
              {customCats.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customCats.map(c=>(
                    <span key={c} className="flex items-center gap-1 rounded-full bg-[#eeeadd] px-3 py-1 text-[11px] text-[#555047] border border-[#e5dfd5]">
                      {c}
                      <button onClick={async () => {
                        const newCats = customCats.filter(x=>x!==c)
                        await supabase.from('profiles').update({custom_categories:newCats}).eq('id',user.id)
                        setProfile((p: any) => ({...p,custom_categories:newCats}))
                      }} className="w-4 h-4 rounded-full bg-[#dccfb2] text-[#8a3e45] flex items-center justify-center text-[10px]">×</button>
                    </span>
                  ))}
                </div>
              )}
              <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}
                className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff]"/>
              <button onClick={agregarGasto} disabled={guardando||!form.description||!form.amount}
                className="w-full rounded-[18px] bg-[#5a4bc3] py-3 text-[15px] font-semibold text-white disabled:opacity-40">
                {guardando?'Guardando...':'Guardar gasto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddingFixed && (
        <div className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm" onClick={() => setIsAddingFixed(false)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-[34px] bg-[#fcfbf8] p-5 pb-8" onClick={e=>e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[#ddd7cc]"/>
            <h2 className="text-[18px] font-semibold text-[#24211d] mb-4">Nuevo gasto fijo</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Nombre del gasto (ej: Netflix)" value={fixedForm.name}
                onChange={e=>setFixedForm(p=>({...p,name:e.target.value}))}
                className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff]"/>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Monto S/" value={fixedForm.amount}
                  onChange={e=>setFixedForm(p=>({...p,amount:e.target.value}))}
                  className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff]"/>
                <input type="number" min="1" max="31" placeholder="Día de cobro" value={fixedForm.day_of_month}
                  onChange={e=>setFixedForm(p=>({...p,day_of_month:e.target.value}))}
                  className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#cfc6ff]"/>
              </div>
              <select value={fixedForm.category} onChange={e=>setFixedForm(p=>({...p,category:e.target.value}))}
                className="w-full rounded-[18px] border border-[#e5dfd5] bg-[#f7f4ed] px-4 py-3 outline-none">
                {allCats.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex items-center justify-between p-4 bg-[#f3f0e8] rounded-[18px] border border-[#ebe6db]">
                <span className="text-[14px] font-medium text-[#24211d]">Estado del gasto fijo</span>
                <button onClick={()=>setFixedForm(p=>({...p,active:!p.active}))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${fixedForm.active?'bg-[#5a4bc3]':'bg-[#ddd7cc]'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${fixedForm.active?'translate-x-6':'translate-x-1'}`}/>
                </button>
              </div>
              <button onClick={agregarFijo} disabled={guardando||!fixedForm.name||!fixedForm.amount}
                className="w-full rounded-[18px] bg-[#5a4bc3] py-3 text-[15px] font-semibold text-white disabled:opacity-40">
                {guardando?'Guardando...':'Guardar gasto fijo'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#ece8df]">
        <div className="max-w-md mx-auto flex">
          {[
            {href:'/dashboard',label:'Inicio',active:false,icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>},
            {href:'/gastos',label:'Gastos',active:true,icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>},
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

      <Link href="/ia" className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-[#5a4bc3] flex items-center justify-center shadow-lg z-40">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </Link>
    </div>
  )
}
