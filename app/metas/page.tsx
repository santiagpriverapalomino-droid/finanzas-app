'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import TourGuide from '../../components/tourguide'

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
  const [abonoCustom, setAbonoCustom] = useState<Record<string, string>>({})
  const [editando, setEditando] = useState<Goal | null>(null)
  const [editForm, setEditForm] = useState({ name: '', target_amount: '', deadline: '' })
  const [simCustom, setSimCustom] = useState<Record<string, string>>({})

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
      user_id: user.id, name: form.name,
      target_amount: parseFloat(form.target_amount), saved_amount: 0,
      deadline: form.deadline || null,
    }).select()
    if (!error && data) { setGoals([...goals, data[0]]); setForm({ name: '', target_amount: '', deadline: '' }); setShowForm(false) }
    setGuardando(false)
  }

  const guardarEdicion = async () => {
    if (!editando || !editForm.name || !editForm.target_amount) return
    setGuardando(true)
    await supabase.from('goals').update({ name: editForm.name, target_amount: parseFloat(editForm.target_amount), deadline: editForm.deadline || null }).eq('id', editando.id)
    setGoals(goals.map(g => g.id === editando.id ? { ...g, name: editForm.name, target_amount: parseFloat(editForm.target_amount), deadline: editForm.deadline } : g))
    setEditando(null)
    setGuardando(false)
  }

  const abonarMeta = async (id: string, monto: number) => {
    if (monto <= 0) return
    const goal = goals.find(g => g.id === id)
    if (!goal) return
    const newAmount = Math.min(goal.target_amount, goal.saved_amount + monto)
    await supabase.from('goals').update({ saved_amount: newAmount }).eq('id', id)
    setGoals(goals.map(g => g.id === id ? { ...g, saved_amount: newAmount } : g))
    setAbonoCustom({ ...abonoCustom, [id]: '' })
  }

  const eliminarMeta = async (id: string) => {
    await supabase.from('goals').delete().eq('id', id)
    setGoals(goals.filter(g => g.id !== id))
  }

  const getPct = (saved: number, target: number) => Math.min(100, Math.round((saved / target) * 100))
  const totalAhorrado = goals.reduce((s, g) => s + g.saved_amount, 0)

  if (loading) return <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center"><p className="text-[#8c887d]">Cargando...</p></div>

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || ''

  return (
    <div className="min-h-screen bg-[#f5f3ee]">

      {/* ── HEADER HERO ── */}
      <div className="bg-[#3d2f9f] px-4 pt-10 pb-10">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[11px] font-semibold tracking-widest text-white/55 uppercase">{firstName}</p>
            <p className="text-[14px] font-bold text-white">Metas</p>
          </div>
          <Link href="/configuracion" className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </Link>
        </div>
        <p className="text-[11px] text-white/60 uppercase tracking-wide mb-1">Total ahorrado</p>
        <p className="text-[44px] font-bold text-white leading-none">S/{totalAhorrado.toLocaleString()}</p>
        <div className="flex gap-2 mt-3">
          <span className="bg-white/15 text-white text-[11px] px-3 py-1.5 rounded-full">{goals.length} {goals.length === 1 ? 'meta activa' : 'metas activas'}</span>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="bg-[#f5f3ee] rounded-t-[28px] -mt-5 px-4 pt-5 pb-28 space-y-4">

        {goals.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-[#c8bbf5] bg-white p-8 text-center">
            <div className="w-14 h-14 bg-[#ede9ff] rounded-[18px] flex items-center justify-center mx-auto mb-3 text-2xl">🎯</div>
            <p className="text-[15px] font-semibold text-[#1f1f1f] mb-1">Sin metas aún</p>
            <p className="text-[13px] text-[#9a9590]">Crea tu primera meta y empieza a ahorrar con un objetivo claro.</p>
          </div>
        ) : goals.map(goal => {
          const pct = getPct(goal.saved_amount, goal.target_amount)
          const sim = simulador[goal.id] || 50
          const simC = simCustom[goal.id] || ''
          const simActivo = simC ? parseFloat(simC) : sim
          const mesesRestantes = simActivo > 0 ? Math.ceil((goal.target_amount - goal.saved_amount) / simActivo) : 0
          const completada = goal.target_amount - goal.saved_amount <= 0

          return (
            <div key={goal.id} className="rounded-[18px] border border-[#ebe6db] bg-white p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[16px] font-bold text-[#1f1f1f]">{goal.name}</p>
                  {goal.deadline && <p className="text-[12px] text-[#9a9590] mt-0.5">{new Date(goal.deadline).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[13px] font-bold ${pct >= 100 ? 'text-[#5a4bc3]' : 'text-[#1a7a45]'}`}>{pct}%</span>
                  <button onClick={() => { setEditando(goal); setEditForm({ name: goal.name, target_amount: String(goal.target_amount), deadline: goal.deadline || '' }) }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[#9b968d] hover:text-[#5a4bc3]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button onClick={() => eliminarMeta(goal.id)} className="w-7 h-7 rounded-full flex items-center justify-center text-[#9b968d] hover:text-[#b24f58]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              </div>

              <div className="h-2.5 rounded-full bg-[#e8f5ee] mb-2 overflow-hidden">
                <div className="h-2.5 rounded-full bg-[#16a34a] transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-[12px] mb-4">
                <span className="text-[#9a9590]">S/{goal.saved_amount.toLocaleString()} de S/{goal.target_amount.toLocaleString()}</span>
                <span className="text-[#5a4bc3] font-semibold">S/{(goal.target_amount - goal.saved_amount).toLocaleString()} restantes</span>
              </div>

              {/* Abonar */}
              {!completada && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#9a9590] mb-2">Abonar</p>
                  <div className="flex gap-2 mb-2">
                    {[50, 100, 200].map(monto => (
                      <button key={monto} onClick={() => abonarMeta(goal.id, monto)}
                        className="flex-1 rounded-[10px] border border-[#ebe6db] py-2 text-[12px] font-semibold text-[#5a4bc3] hover:bg-[#ede9ff] hover:border-[#5a4bc3] transition-all">
                        +S/{monto}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Monto personalizado"
                      value={abonoCustom[goal.id] || ''}
                      onChange={e => setAbonoCustom({ ...abonoCustom, [goal.id]: e.target.value })}
                      className="flex-1 rounded-[12px] border border-[#ebe6db] bg-[#f7f4ed] px-3 py-2.5 text-[13px] outline-none focus:border-[#5a4bc3]"/>
                    <button onClick={() => abonarMeta(goal.id, parseFloat(abonoCustom[goal.id] || '0'))}
                      disabled={!abonoCustom[goal.id] || parseFloat(abonoCustom[goal.id]) <= 0}
                      className="rounded-[12px] bg-[#5a4bc3] px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-40">
                      Abonar
                    </button>
                  </div>
                </div>
              )}

              {/* Simulador IA */}
              <div className="rounded-[14px] bg-[#fdf8ec] border border-[#f0e6c8] p-3" data-tour="simulador">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[14px]">✨</span>
                  <p className="text-[12px] font-bold text-[#92400e]">Simulador IA</p>
                </div>
                {completada ? (
                  <p className="text-[13px] text-[#78350f] font-bold">🎉 ¡Meta completada!</p>
                ) : (
                  <>
                    <p className="text-[12px] text-[#78350f] mb-2 leading-5">
                      Faltan <span className="font-bold">S/{(goal.target_amount - goal.saved_amount).toLocaleString()}</span>
                      {simActivo > 0 && <> — ahorrando <span className="font-bold">S/{simActivo}/mes</span> llegarías en <span className="font-bold">{mesesRestantes} {mesesRestantes === 1 ? 'mes' : 'meses'}</span></>}
                      {goal.deadline && simActivo > 0 && (() => {
                        const hoy = new Date()
                        const limite = new Date(goal.deadline)
                        const mesesHastaFecha = Math.ceil((limite.getTime() - hoy.getTime()) / (1000*60*60*24*30))
                        const necesario = Math.ceil((goal.target_amount - goal.saved_amount) / mesesHastaFecha)
                        return <span className="block mt-1">Para llegar antes del {new Date(goal.deadline).toLocaleDateString('es-PE',{day:'numeric',month:'long'})}, necesitas ahorrar <span className="font-bold">S/{necesario}/mes</span>.</span>
                      })()}
                    </p>
                    <div className="flex gap-2 mb-2">
                      {[50, 150, 300].map(monto => (
                        <button key={monto} onClick={() => { setSimulador({ ...simulador, [goal.id]: monto }); setSimCustom({ ...simCustom, [goal.id]: '' }) }}
                          className={`flex-1 rounded-full py-1.5 text-[11px] font-bold transition-all ${sim === monto && !simC ? 'bg-[#5a4bc3] text-white' : 'border border-[#f0e6c8] text-[#78350f]'}`}>
                          S/{monto}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 items-center">
                      <input type="number" placeholder="Tu monto/mes"
                        value={simC}
                        onChange={e => setSimCustom({ ...simCustom, [goal.id]: e.target.value })}
                        className="flex-1 rounded-[10px] border border-[#f0e6c8] bg-white px-3 py-1.5 text-[12px] outline-none focus:border-[#5a4bc3]"/>
                      <span className="text-[11px] text-[#92400e]">por mes</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}

        {showForm && (
          <div className="rounded-[18px] border border-[#c8bbf5] bg-white p-4">
            <p className="text-[14px] font-bold text-[#3d2fa0] mb-3">Nueva meta</p>
            <div className="space-y-3">
              <input type="text" placeholder="Nombre de la meta (ej: Viaje a Cusco)"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-[14px] border border-[#ebe6db] bg-[#f7f4ed] px-4 py-3 text-[14px] outline-none focus:border-[#5a4bc3]"/>
              <input type="number" placeholder="Monto objetivo en S/"
                value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })}
                className="w-full rounded-[14px] border border-[#ebe6db] bg-[#f7f4ed] px-4 py-3 text-[14px] outline-none focus:border-[#5a4bc3]"/>
              <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
                className="w-full rounded-[14px] border border-[#ebe6db] bg-[#f7f4ed] px-4 py-3 text-[14px] outline-none focus:border-[#5a4bc3]"/>
              <div className="flex gap-2">
                <button onClick={() => setShowForm(false)} className="flex-1 rounded-[14px] border border-[#ebe6db] py-3 text-[14px] text-[#9a9590]">Cancelar</button>
                <button onClick={agregarMeta} disabled={guardando || !form.name || !form.target_amount}
                  className="flex-1 rounded-[14px] bg-[#5a4bc3] py-3 text-[14px] font-bold text-white disabled:opacity-40">
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}

        <button data-tour="agregar-meta" onClick={() => setShowForm(true)}
          className="w-full rounded-[16px] bg-[#5a4bc3] py-4 text-[15px] font-bold text-white">
          + Nueva meta
        </button>
      </div>

      {/* Modal editar */}
      {editando && (
        <div className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm" onClick={() => setEditando(null)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-[34px] bg-white p-5 pb-8" onClick={e => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[#ddd7cc]"/>
            <h2 className="text-[18px] font-semibold text-[#1f1f1f] mb-4">Editar meta</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Nombre" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="w-full rounded-[14px] border border-[#ebe6db] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#5a4bc3]"/>
              <input type="number" placeholder="Monto objetivo" value={editForm.target_amount} onChange={e => setEditForm(p => ({ ...p, target_amount: e.target.value }))} className="w-full rounded-[14px] border border-[#ebe6db] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#5a4bc3]"/>
              <input type="date" value={editForm.deadline} onChange={e => setEditForm(p => ({ ...p, deadline: e.target.value }))} className="w-full rounded-[14px] border border-[#ebe6db] bg-[#f7f4ed] px-4 py-3 outline-none focus:border-[#5a4bc3]"/>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setEditando(null)} className="rounded-[14px] border border-[#ebe6db] py-3 text-[14px] text-[#9a9590]">Cancelar</button>
                <button onClick={guardarEdicion} disabled={guardando || !editForm.name || !editForm.target_amount} className="rounded-[14px] bg-[#5a4bc3] py-3 text-[14px] font-bold text-white disabled:opacity-40">
                  {guardando ? 'Guardando...' : 'Guardar'}
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
            {href:'/metas',label:'Metas',active:true,icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>},
            {href:'/inversiones',label:'Inversiones',active:false,icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>},
          ].map((item:any) => (
            <Link key={item.href} href={item.href} className={`flex-1 flex flex-col items-center py-3 gap-1 ${item.active?'text-[#5a4bc3]':'text-[#8c887d]'}`}>
              {item.icon}
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <Link href="/ia" className="fixed bottom-20 right-4 w-12 h-12 rounded-full bg-[#5a4bc3] flex items-center justify-center shadow-lg z-40">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </Link>

      <TourGuide tourKey="metas" steps={[
        { target:'agregar-meta', title:'🎯 Crea una meta', message:'Define una meta con monto y fecha límite.', position:'top' },
        { target:'simulador', title:'✨ Simulador IA', message:'Te calcula cuánto necesitas ahorrar por mes para llegar a tu meta a tiempo.', position:'top' }
      ]}/>
    </div>
  )
}