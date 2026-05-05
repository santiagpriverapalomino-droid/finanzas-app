'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Onboarding() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [step, setStep] = useState(0)
  const [ingreso, setIngreso] = useState('')
  const [diaCobro, setDiaCobro] = useState('')
  const [esPrimerSueldo, setEsPrimerSueldo] = useState<boolean | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const { data: profile } = await supabase.from('profiles').select('monthly_income, salary_day').eq('id', user.id).single()
      if (profile?.monthly_income && profile?.salary_day) router.push('/dashboard')
    }
    init()
  }, [])

  const guardarYContinuar = async () => {
    if (!ingreso || !diaCobro || esPrimerSueldo === null) return
    setGuardando(true)
    await supabase.from('profiles').upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email,
      monthly_income: parseFloat(ingreso),
      salary_day: parseInt(diaCobro),
      is_first_salary_mode: esPrimerSueldo === true,
      needs_percent: 50,
      wants_percent: 30,
      savings_percent: 20,
    })
    setGuardando(false)
    setStep(2)
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'ahí'

  const features = [
    {
      icon: '💳',
      title: 'Tu banco, automático',
      desc: 'Conecta tu Gmail y los gastos del BCP aparecen solos — sin escribir nada.',
      locked: false,
    },
    {
      icon: '📊',
      title: 'Sabe en qué gastas',
      desc: 'Ve exactamente a dónde va tu plata cada mes con gráficas claras.',
      locked: false,
    },
    {
      icon: '🎯',
      title: 'Ahorra con un objetivo',
      desc: 'Crea metas y el simulador IA te dice cuánto ahorrar por mes para llegar.',
      locked: false,
    },
    {
      icon: '🤖',
      title: 'Tu asesor financiero',
      desc: 'Pregúntale cualquier cosa sobre tu plata. Conoce tu situación y responde al instante.',
      locked: false,
    },
    {
      icon: '📈',
      title: 'Invierte tu dinero',
      desc: 'Desbloquea inversiones al llegar a 14 días seguidos registrando gastos.',
      locked: true,
    },
  ]

  return (
    <div className="min-h-screen bg-[#f5f3ee] flex flex-col">

      {/* ── PASO 0: Bienvenida ── */}
      {step === 0 && (
        <div className="flex-1 flex flex-col">
          <div className="bg-[#3d2f9f] px-6 pt-16 pb-12">
            <div className="w-16 h-16 rounded-[20px] bg-white/15 flex items-center justify-center mb-5">
              <svg width="36" height="36" viewBox="0 0 44 44" fill="none">
                <polyline points="4,36 14,20 22,28 32,10 40,18" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="36" cy="8" r="4" fill="#FCD34D"/>
                <circle cx="8" cy="38" r="3" fill="#4ade80"/>
              </svg>
            </div>
            <h1 className="text-[28px] font-bold text-white mb-2">Hola, {firstName} 👋</h1>
            <p className="text-[15px] text-white/70 leading-relaxed">
              Bienvenido a <span className="font-bold text-white">Finti</span> — tu gestor financiero inteligente para jóvenes peruanos.
            </p>
          </div>

          <div className="bg-[#f5f3ee] rounded-t-[28px] -mt-5 px-6 pt-6 pb-10 flex-1 flex flex-col">
            <p className="text-[13px] font-bold text-[#9a9590] uppercase tracking-wide mb-4">Esto es lo que vas a poder hacer</p>
            <div className="space-y-3 flex-1">
              {features.map(f => (
                <div key={f.title} className={`flex items-start gap-3 rounded-[16px] px-4 py-3 border ${f.locked ? 'bg-[#f7f4ed] border-[#e5dfd5] opacity-70' : 'bg-white border-[#ebe6db]'}`}>
                  <span className="text-xl flex-shrink-0 mt-0.5">{f.locked ? '🔒' : f.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-[13px] font-bold ${f.locked ? 'text-[#9a9590]' : 'text-[#1f1f1f]'}`}>{f.title}</p>
                      {f.locked && <span className="text-[10px] font-bold text-white bg-[#5a4bc3] px-2 py-0.5 rounded-full">14 días</span>}
                    </div>
                    <p className="text-[12px] text-[#9a9590] mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setStep(1)} className="w-full bg-[#5a4bc3] text-white rounded-[16px] py-4 font-bold text-[16px] mt-6">
              Empezar 🚀
            </button>
            <p className="text-center text-[12px] text-[#9a9590] mt-3">100% gratis · Sin tarjeta de crédito</p>
          </div>
        </div>
      )}

      {/* ── PASO 1: Ingreso + primer sueldo ── */}
      {step === 1 && (
        <div className="flex-1 flex flex-col">
          <div className="bg-[#3d2f9f] px-6 pt-16 pb-12">
            <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-3">Paso 1 de 1</p>
            <h2 className="text-[26px] font-bold text-white mb-2">Cuéntanos sobre ti</h2>
            <p className="text-[14px] text-white/70">Solo necesitamos 3 datos para personalizar tu experiencia.</p>
          </div>

          <div className="bg-[#f5f3ee] rounded-t-[28px] -mt-5 px-6 pt-6 pb-10 flex-1 flex flex-col overflow-y-auto">
            <div className="space-y-4 flex-1">

              {/* Ingreso */}
              <div>
                <label className="text-[12px] font-bold uppercase tracking-wide text-[#9a9590] mb-2 block">¿Cuánto ganas al mes?</label>
                <div className="flex items-center bg-white rounded-[16px] border border-[#ebe6db] px-4 overflow-hidden">
                  <span className="text-[16px] font-bold text-[#5a4bc3] mr-2">S/</span>
                  <input type="number" placeholder="Ej: 1200" value={ingreso}
                    onChange={e => setIngreso(e.target.value)}
                    className="flex-1 py-4 text-[18px] font-bold outline-none bg-transparent text-[#1f1f1f]"/>
                </div>
                {ingreso && (
                  <p className="text-[11px] text-[#16a34a] mt-1.5 px-1">
                    Tu presupuesto diario es S/{Math.round(parseFloat(ingreso)/30)} aprox.
                  </p>
                )}
              </div>

              {/* Día de cobro */}
              <div>
                <label className="text-[12px] font-bold uppercase tracking-wide text-[#9a9590] mb-2 block">¿Qué día del mes cobras?</label>
                <input type="number" min="1" max="31" placeholder="Ej: 15" value={diaCobro}
                  onChange={e => setDiaCobro(e.target.value)}
                  className="w-full rounded-[16px] border border-[#ebe6db] bg-white px-4 py-4 text-[18px] font-bold outline-none focus:border-[#5a4bc3] text-[#1f1f1f]"/>
              </div>

              {/* Primer sueldo */}
              <div>
                <label className="text-[12px] font-bold uppercase tracking-wide text-[#9a9590] mb-2 block">¿Es tu primer sueldo?</label>
                <div className="space-y-2">
                  <button onClick={() => setEsPrimerSueldo(true)}
                    className={`w-full rounded-[16px] border-2 p-4 text-left transition-all ${esPrimerSueldo === true ? 'border-[#5a4bc3] bg-[#ede9ff]' : 'border-[#ebe6db] bg-white'}`}>
                    <p className="font-bold text-[#1f1f1f] text-[14px]">⚡ Sí, es mi primer sueldo</p>
                    <p className="text-[12px] text-[#9a9590] mt-0.5">Activamos el plan 50/30/20 para ayudarte a distribuir tu ingreso.</p>
                  </button>
                  <button onClick={() => setEsPrimerSueldo(false)}
                    className={`w-full rounded-[16px] border-2 p-4 text-left transition-all ${esPrimerSueldo === false ? 'border-[#5a4bc3] bg-[#ede9ff]' : 'border-[#ebe6db] bg-white'}`}>
                    <p className="font-bold text-[#1f1f1f] text-[14px]">📊 No, ya manejo mis finanzas</p>
                    <p className="text-[12px] text-[#9a9590] mt-0.5">Ir directo al dashboard completo.</p>
                  </button>
                </div>
              </div>

              {esPrimerSueldo === true && ingreso && (
                <div className="rounded-[16px] bg-[#ede9ff] border border-[#c8bbf5] p-4">
                  <p className="text-[12px] font-bold text-[#3d2fa0] mb-3">Tu plan 50/30/20</p>
                  {[
                    { label: 'Necesidades', pct: 50, color: '#5a4bc3' },
                    { label: 'Gustos', pct: 30, color: '#f1a22e' },
                    { label: 'Ahorro', pct: 20, color: '#16a34a' },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center mb-2">
                      <span className="text-[13px] text-[#3d2fa0]">{item.label}</span>
                      <span className="text-[13px] font-bold" style={{color: item.color}}>
                        {item.pct}% · S/{Math.round(parseFloat(ingreso) * item.pct / 100)}
                      </span>
                    </div>
                  ))}
                  <p className="text-[11px] text-[#6b5fc0] mt-2">Puedes ajustar estos porcentajes en Configuración cuando quieras.</p>
                </div>
              )}
            </div>

            <button onClick={guardarYContinuar}
              disabled={!ingreso || !diaCobro || esPrimerSueldo === null || guardando}
              className="w-full bg-[#5a4bc3] text-white rounded-[16px] py-4 font-bold text-[16px] disabled:opacity-40 mt-6">
              {guardando ? 'Guardando...' : 'Listo, empezar →'}
            </button>
          </div>
        </div>
      )}

      {/* ── PASO 2: Listo ── */}
      {step === 2 && (
        <div className="flex-1 flex flex-col">
          <div className="bg-[#3d2f9f] px-6 pt-16 pb-12">
            <div className="w-16 h-16 rounded-[20px] bg-white/15 flex items-center justify-center mb-5 text-4xl">
              🎉
            </div>
            <h2 className="text-[26px] font-bold text-white mb-2">Todo listo, {firstName}</h2>
            <p className="text-[14px] text-white/70">Ya puedes empezar a controlar tu plata con Finti.</p>
          </div>

          <div className="bg-[#f5f3ee] rounded-t-[28px] -mt-5 px-6 pt-6 pb-10 flex-1 flex flex-col">
            <div className="space-y-3 flex-1">
              <div className="rounded-[18px] bg-white border border-[#ebe6db] p-5">
                <p className="text-[14px] font-bold text-[#1f1f1f] mb-3">Tu primer paso 👇</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#ede9ff] flex items-center justify-center text-sm flex-shrink-0">1</div>
                    <p className="text-[13px] text-[#47433d]">Conecta tu Gmail para importar gastos del BCP automáticamente</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#ede9ff] flex items-center justify-center text-sm flex-shrink-0">2</div>
                    <p className="text-[13px] text-[#47433d]">Registra tu primer gasto del día de hoy</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#ede9ff] flex items-center justify-center text-sm flex-shrink-0">3</div>
                    <p className="text-[13px] text-[#47433d]">Pregúntale algo a Finti IA sobre tus finanzas</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[18px] bg-[#ede9ff] border border-[#c8bbf5] p-4 flex items-center gap-3">
                <span className="text-2xl">🔒</span>
                <div>
                  <p className="text-[13px] font-bold text-[#3d2fa0]">Inversiones — se desbloquea en 14 días</p>
                  <p className="text-[12px] text-[#6b5fc0]">Registra gastos 14 días seguidos y desbloqueas la pantalla de inversiones.</p>
                </div>
              </div>
            </div>

            <button onClick={() => router.push('/dashboard')}
              className="w-full bg-[#5a4bc3] text-white rounded-[16px] py-4 font-bold text-[16px] mt-6">
              ¡Ir a mi dashboard! 🚀
            </button>
          </div>
        </div>
      )}

    </div>
  )
}