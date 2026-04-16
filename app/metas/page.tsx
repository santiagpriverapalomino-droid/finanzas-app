'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

interface Goal {
  id: string
  name: string
  target_amount: number
  saved_amount: number
  deadline: string
}

export default function Metas() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({ name: '', target_amount: '', deadline: '' })
  const [simulador, setSimulador] = useState<Record<string, number>>({})

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const { data } = await supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: true })
      setGoals(data || [])
      setLoading(false)
    }
    init()
  }, [])

  const agregarMeta = async () => {
    if (!form.name || !form.target_amount) return
    setGuardando(true)
    const { data, error } = await supabase.from('goals').insert({
      user_id: user.id,
      name: form.name,
      target_amount: parseFloat(form.target_amount),
      saved_amount: 0,
      deadline: form.deadline || null,
    }).select()
    if (!error && data) {
      setGoals([...goals, data[0]])
      setForm({ name: '', target_amount: '', deadline: '' })
      setShowForm(false)
    }
    setGuardando(false)
  }

  const abonarMeta = async (id: string, monto: number) => {
    const goal = goals.find(g => g.id === id)
    if (!goal) return
    const newAmount = Math.min(goal.target_amount, goal.saved_amount + monto)
    await supabase.from('goals').update({ saved_amount: newAmount }).eq('id', id)
    setGoals(goals.map(g => g.id === id ? { ...g, saved_amount: newAmount } : g))
  }

  const eliminarMeta = async (id: string) => {
    await supabase.from('goals').delete().eq('id', id)
    setGoals(goals.filter(g => g.id !== id))
  }

  const getPct = (saved: number, target: number) => Math.min(100, Math.round((saved / target) * 100))

  if (loading) return <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center"><p className="text-[#8c887d]">Cargando...</p></div>

  return (
    <div className="min-h-screen bg-[#f5f3ee]">
      {/* Header */}
      <div className="px-4 pt-5 pb-2 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-[#8c887d] uppercase">{user?.user_metadata?.full_name?.split(' ')[0]}</p>
          <p className="text-[13px] font-bold tracking-widest text-[#1f1f1f] uppercase">Metas de Ahorro</p>
        </div>
        <div className="flex gap-2">
          <Link href="/configuracion" className="w-9 h-9 rounded-full bg-[#ece8df] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5a4bc3" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </Link>
        </div>
      </div>

      <div className="px-4 pb-24 space-y-4 mt-2">

        {/* Resumen */}
        <div className="rounded-[18px] bg-[#f3f0e8] p-4">
          <p className="text-[13px] text-[#4d4a43]">Mis metas</p>
          <p className="text-[18px] font-semibold text-[#1f1f1f] mt-1">{goals.length} activas · S/{goals.reduce((s, g) => s + g.saved_amount, 0).toLocaleString()} ahorrados en total</p>
        </div>

        {/* Lista de metas */}
        {goals.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-[#c8bbf5] bg-[#faf9ff] p-8 text-center">
            <p className="text-[#8c887d] text-[14px]">Aún no has creado metas.</p>
            <p className="text-[#8c887d] text-[13px] mt-1">Agrega una para seguir tu progreso real de ahorro.</p>
          </div>
        ) : (
          goals.map(goal => {
            const pct = getPct(goal.saved_amount, goal.target_amount)
            const sim = simulador[goal.id] || 50
            return (
              <div key={goal.id} className="rounded-[22px] border border-[#ebe6db] bg-white p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[16px] font-bold text-[#1f1f1f]">{goal.name}</p>
                    {goal.deadline && <p className="text-[12px] text-[#8c887d]">{new Date(goal.deadline).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[#22c55e]">{pct}%</span>
                    <button onClick={() => eliminarMeta(goal.id)} className="text-[#b24f58] opacity-60 hover:opacity-100">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                    </button>
                  </div>
                </div>

                <div className="h-2 rounded-full bg-[#ece7dd] mb-2">
                  <div className="h-2 rounded-full bg-[#22c55e] transition-all" style={{ width: `${pct}%` }} />
                </div>

                <div className="flex justify-between text-[13px] text-[#8c887d] mb-3">
                  <span>S/{goal.saved_amount.toLocaleString()} de S/{goal.target_amount.toLocaleString()}</span>
                  <span className="text-[#5a4bc3] font-semibold">Meta real</span>
                </div>

                {/* Botones abonar */}
                <div className="flex gap-2 mb-4">
                  {[50, 100].map(monto => (
                    <button key={monto} onClick={() => abonarMeta(goal.id, monto)}
                      className="rounded-full border border-[#e2decb] px-4 py-1.5 text-[13px] font-medium text-[#47433d] hover:bg-[#ede9ff] hover:border-[#5a4bc3] hover:text-[#5a4bc3] transition-all">
                      +S/{monto}
                    </button>
                  ))}
                </div>

                {/* Simulador IA */}
                <div className="rounded-[16px] bg-[#fdf8ec] border border-[#f0e6c8] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span>✨</span>
                    <p className="text-[13px] font-bold text-[#92400e]">Simulador IA</p>
                  </div>
                  <p className="text-[13px] text-[#78350f] mb-3">
                    {goal.target_amount - goal.saved_amount <= 0
                      ? '🎉 ¡Meta completada!'
                      : `Si ahorras S/${sim} más al mes, llegarías a tu meta en ${Math.ceil((goal.target_amount - goal.saved_amount) / sim)} meses.`
                    }
                  </p>
                  <div className="flex gap-2">
                    {[50, 150, 300].map(monto => (
                      <button key={monto} onClick={() => setSimulador({ ...simulador, [goal.id]: monto })}
                        className={`flex-1 rounded-full py-1.5 text-[12px] font-bold transition-all ${sim === monto ? 'bg-[#5a4bc3] text-white' : 'border border-[#e2decb] text-[#47433d]'}`}>
                        +S/{monto}/mes
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })
        )}

        {/* Formulario nueva meta */}
        {showForm && (
          <div className="rounded-[22px] border border-[#c8bbf5] bg-[#faf9ff] p-4">
            <p className="text-[14px] font-bold text-[#3d2fa0] mb-3">Nueva meta</p>
            <div className="space-y-3">
              <input type="text" placeholder="Nombre de la meta (ej: Viaje a Cusco)"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-[12px] border border-[#e2decb] bg-white px-4 py-3 text-[14px] focus:outline-none focus:border-[#5a4bc3]" />
              <input type="number" placeholder="Monto objetivo en S/"
                value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })}
                className="w-full rounded-[12px] border border-[#e2decb] bg-white px-4 py-3 text-[14px] focus:outline-none focus:border-[#5a4bc3]" />
              <input type="date" placeholder="Fecha límite (opcional)"
                value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
                className="w-full rounded-[12px] border border-[#e2decb] bg-white px-4 py-3 text-[14px] focus:outline-none focus:border-[#5a4bc3]" />
              <div className="flex gap-2">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 rounded-[12px] border border-[#e2decb] py-3 text-[14px] text-[#8c887d]">Cancelar</button>
                <button onClick={agregarMeta} disabled={guardando || !form.name || !form.target_amount}
                  className="flex-1 rounded-[12px] bg-[#5a4bc3] py-3 text-[14px] font-bold text-white disabled:opacity-40">
                  {guardando ? 'Guardando...' : 'Guardar meta'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Botón nueva meta */}
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="w-full rounded-[16px] bg-[#5a4bc3] py-4 text-[15px] font-bold text-white">
            + Nueva meta
          </button>
        )}

      </div>

      {/* Navbar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#ece8df]">
        <div className="max-w-md mx-auto flex">
          {[
            { href: '/dashboard', label: 'Inicio', active: false },
            { href: '/gastos', label: 'Gastos', active: false },
            { href: '/metas', label: 'Metas', active: true },
            { href: '/inversiones', label: 'Inversiones', active: false },
          ].map(item => (
            <Link key={item.href} href={item.href} className={`flex-1 flex flex-col items-center py-3 gap-1 ${item.active ? 'text-[#5a4bc3]' : 'text-[#8c887d]'}`}>
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

