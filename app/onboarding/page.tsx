'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const STEPS = ['bienvenida', 'ingreso', 'primer_sueldo', 'tutorial']

export default function Onboarding() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [step, setStep] = useState(0)
  const [ingreso, setIngreso] = useState('')
  const [diaCobro, setDiaCobro] = useState('1')
  const [esPrimerSueldo, setEsPrimerSueldo] = useState<boolean | null>(null)
  const [needsPct, setNeedsPct] = useState(50)
  const [wantsPct, setWantsPct] = useState(30)
  const [savingsPct, setSavingsPct] = useState(20)
  const [tutorialStep, setTutorialStep] = useState(0)
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
    if (!ingreso || !diaCobro) return
    setGuardando(true)
    await supabase.from('profiles').upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email,
      monthly_income: parseFloat(ingreso),
      salary_day: parseInt(diaCobro),
      is_first_salary_mode: esPrimerSueldo === true,
      needs_percent: needsPct,
      wants_percent: wantsPct,
      savings_percent: savingsPct,
    })
    setGuardando(false)
    setStep(3)
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'ahí'

  const tutorialPasos = [
    {
      icon: '📊',
      title: 'Registra tus gastos',
      desc: 'Agrega cada gasto del día. La IA los categoriza automáticamente para darte un análisis real de tus hábitos.',
      tips: ['Escanea tu boleta con la cámara', 'Importa tu estado de cuenta del banco', 'Registra en soles o dólares'],
      dato: { numero: '73%', texto: 'de jóvenes no sabe en qué gasta su dinero. Finti lo cambia.' }
    },
    {
      icon: '🎯',
      title: 'Crea metas de ahorro',
      desc: 'Define hacia dónde quieres llegar — un viaje, un fondo de emergencia, lo que sea. Te ayudamos a llegar.',
      tips: ['Pon una fecha límite a tu meta', 'El simulador calcula cuánto ahorrar por mes', 'Abona cuando quieras y ve tu progreso'],
      dato: { numero: '2x', texto: 'más probable cumplir una meta si tiene fecha límite.' }
    },
    {
      icon: '📈',
      title: 'Invierte con confianza',
      desc: 'Conoce opciones de inversión adaptadas al contexto peruano: fondos mutuos, depósitos a plazo y más.',
      tips: ['Registra fondos mutuos, acciones y ETFs', 'Ve la proyección de tu dinero a 1, 5 y 10 años', 'Compara el rendimiento de tus inversiones'],
      dato: { numero: 'S/50', texto: 'es suficiente para empezar a invertir en fondos mutuos en Perú.' }
    },
    {
      icon: '🤖',
      title: 'Tu asesor IA siempre disponible',
      desc: 'Pregúntale cualquier cosa sobre finanzas. Conoce tus datos y te da consejos personalizados en tiempo real.',
      tips: ['Conoce tu AFP, CTS y opciones de ahorro', 'Analiza tus gastos y sugiere mejoras', 'Disponible 24/7, responde en segundos'],
      dato: { numero: '100%', texto: 'de contexto peruano — entiende soles, Yape, BCP y más.' }
    },
  ]

  return (
    <div className="min-h-screen bg-[#f5f3ee] flex flex-col">

      {/* ── PASO 0: Bienvenida ── */}
      {step === 0 && (
        <div className="flex-1 flex flex-col">
          {/* Hero */}
          <div className="bg-[#5a4bc3] px-6 pt-16 pb-12">
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

          {/* Body */}
          <div className="bg-[#f5f3ee] rounded-t-[28px] -mt-5 px-6 pt-6 pb-10 flex-1 flex flex-col">
            <div className="space-y-3 mb-6 flex-1">
              {[
                { icon: '🤖', title: 'Asesor IA personalizado', desc: 'Pregúntale cualquier cosa sobre finanzas. Conoce tus datos y responde en segundos.' },
                { icon: '📸', title: 'Escanea tus boletas', desc: 'Saca foto a tu ticket y la IA registra el gasto automáticamente.' },
                { icon: '🏦', title: 'Importa tu estado de cuenta', desc: 'Sube tu estado del BCP, BBVA o Interbank y tus gastos se importan solos.' },
                { icon: '📊', title: 'Dashboard completo', desc: 'Visualiza gastos, metas e inversiones en tiempo real.' },
                { icon: '📧', title: 'Sync automático con Gmail', desc: 'Conecta tu Gmail y los gastos del banco aparecen solos.' },
              ].map(f => (
                <div key={f.title} className="flex items-start gap-3 bg-white rounded-[16px] px-4 py-3 border border-[#ebe6db]">
                  <span className="text-xl flex-shrink-0 mt-0.5">{f.icon}</span>
                  <div>
                    <p className="text-[13px] font-bold text-[#1f1f1f]">{f.title}</p>
                    <p className="text-[12px] text-[#9a9590] mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setStep(1)} className="w-full bg-[#5a4bc3] text-white rounded-[16px] py-4 font-bold text-[16px]">
              Empezar — son solo 2 minutos 🚀
            </button>
            <p className="text-center text-[12px] text-[#9a9590] mt-3">100% gratis · Sin tarjeta de crédito</p>
          </div>
        </div>
      )}

      {/* ── PASO 1: Ingreso ── */}
      {step === 1 && (
        <div className="flex-1 flex flex-col">
          <div className="bg-[#5a4bc3] px-6 pt-16 pb-12">
            <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-3">Paso 1 de 3</p>
            <h2 className="text-[26px] font-bold text-white mb-2">Tu ingreso mensual</h2>
            <p className="text-[14px] text-white/70">Esto nos ayuda a calcular tu presupuesto y alertas de gasto.</p>
          </div>

          <div className="bg-[#f5f3ee] rounded-t-[28px] -mt-5 px-6 pt-6 pb-10 flex-1 flex flex-col">
            <div className="space-y-4 mb-6 flex-1">
              <div>
                <label className="text-[12px] font-bold uppercase tracking-wide text-[#9a9590] mb-2 block">¿Cuánto ganas al mes?</label>
                <div className="flex items-center bg-white rounded-[16px] border border-[#ebe6db] px-4 overflow-hidden">
                  <span className="text-[16px] font-bold text-[#5a4bc3] mr-2">S/</span>
                  <input
                    type="number" placeholder="Ej: 2500" value={ingreso}
                    onChange={e => setIngreso(e.target.value)}
                    className="flex-1 py-4 text-[18px] font-bold outline-none bg-transparent text-[#1f1f1f]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[12px] font-bold uppercase tracking-wide text-[#9a9590] mb-2 block">¿Qué día del mes cobras?</label>
                <input
                  type="number" min="1" max="31" placeholder="Ej: 15" value={diaCobro}
                  onChange={e => setDiaCobro(e.target.value)}
                  className="w-full rounded-[16px] border border-[#ebe6db] bg-white px-4 py-4 text-[18px] font-bold outline-none focus:border-[#5a4bc3] text-[#1f1f1f]"
                />
              </div>
              {ingreso && (
                <div className="rounded-[14px] bg-[#edf7f2] border border-[#bbf7d0] p-3">
                  <p className="text-[12px] text-[#166534]">💡 Con S/{ingreso}/mes, tu presupuesto diario es aproximadamente S/{Math.round(parseFloat(ingreso)/30)}.</p>
                </div>
              )}
            </div>

            <button onClick={() => ingreso && diaCobro && setStep(2)} disabled={!ingreso || !diaCobro}
              className="w-full bg-[#5a4bc3] text-white rounded-[16px] py-4 font-bold text-[16px] disabled:opacity-40">
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* ── PASO 2: Primer sueldo ── */}
      {step === 2 && (
        <div className="flex-1 flex flex-col">
          <div className="bg-[#5a4bc3] px-6 pt-16 pb-12">
            <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-3">Paso 2 de 3</p>
            <h2 className="text-[26px] font-bold text-white mb-2">¿Eres nuevo en finanzas?</h2>
            <p className="text-[14px] text-white/70">Te activamos el plan 50/30/20 para que empieces con el pie derecho.</p>
          </div>

          <div className="bg-[#f5f3ee] rounded-t-[28px] -mt-5 px-6 pt-6 pb-10 flex-1 flex flex-col overflow-y-auto">
            <div className="space-y-3 mb-5">
              <button onClick={() => setEsPrimerSueldo(true)}
                className={`w-full rounded-[16px] border-2 p-4 text-left transition-all ${esPrimerSueldo === true ? 'border-[#5a4bc3] bg-[#ede9ff]' : 'border-[#ebe6db] bg-white'}`}>
                <p className="font-bold text-[#1f1f1f]">⚡ Sí, activa el modo primer sueldo</p>
                <p className="text-[12px] text-[#9a9590] mt-1">Te mostramos cómo dividir tu ingreso: 50% necesidades, 30% gustos, 20% ahorro.</p>
              </button>
              <button onClick={() => setEsPrimerSueldo(false)}
                className={`w-full rounded-[16px] border-2 p-4 text-left transition-all ${esPrimerSueldo === false ? 'border-[#5a4bc3] bg-[#ede9ff]' : 'border-[#ebe6db] bg-white'}`}>
                <p className="font-bold text-[#1f1f1f]">📊 No, ya manejo mis finanzas</p>
                <p className="text-[12px] text-[#9a9590] mt-1">Ir directo al dashboard completo.</p>
              </button>
            </div>

            {esPrimerSueldo === true && (
              <div className="rounded-[16px] bg-[#ede9ff] border border-[#c8bbf5] p-4 mb-5">
                <p className="text-[12px] font-bold uppercase tracking-wide text-[#3d2fa0] mb-3">Personaliza tu plan</p>
                {[
                  { label: 'Necesidades', value: needsPct, set: setNeedsPct, color: '#5a4bc3' },
                  { label: 'Gustos', value: wantsPct, set: setWantsPct, color: '#f1a22e' },
                  { label: 'Ahorro', value: savingsPct, set: setSavingsPct, color: '#1a7a45' },
                ].map(item => (
                  <div key={item.label} className="mb-3">
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="text-[#3d2fa0] font-medium">{item.label}</span>
                      <span className="font-bold" style={{ color: item.color }}>{item.value}% · S/{Math.round(parseFloat(ingreso || '0') * item.value / 100)}</span>
                    </div>
                    <input type="range" min="0" max="100" value={item.value}
                      onChange={e => item.set(parseInt(e.target.value))}
                      className="w-full accent-[#5a4bc3]"/>
                  </div>
                ))}
                <p className={`text-[11px] text-center font-bold ${needsPct + wantsPct + savingsPct === 100 ? 'text-[#1a7a45]' : 'text-[#b24f58]'}`}>
                  Total: {needsPct + wantsPct + savingsPct}% {needsPct + wantsPct + savingsPct !== 100 ? '⚠️ debe sumar 100%' : '✅'}
                </p>
              </div>
            )}

            <button onClick={guardarYContinuar}
              disabled={esPrimerSueldo === null || guardando || (esPrimerSueldo === true && needsPct + wantsPct + savingsPct !== 100)}
              className="w-full bg-[#5a4bc3] text-white rounded-[16px] py-4 font-bold text-[16px] disabled:opacity-40 mt-auto">
              {guardando ? 'Guardando...' : 'Continuar →'}
            </button>
          </div>
        </div>
      )}

      {/* ── PASO 3: Tutorial ── */}
      {step === 3 && (
        <div className="flex-1 flex flex-col">
          <div className="bg-[#5a4bc3] px-6 pt-16 pb-12">
            <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-3">Paso 3 de 3</p>
            <h2 className="text-[26px] font-bold text-white mb-2">¿Cómo funciona Finti?</h2>
            <p className="text-[14px] text-white/70">Conoce todo lo que puedes hacer.</p>
          </div>

          <div className="bg-[#f5f3ee] rounded-t-[28px] -mt-5 px-6 pt-6 pb-10 flex-1 flex flex-col">
            {/* Card tutorial */}
            <div className="rounded-[18px] bg-white border border-[#ebe6db] p-5 mb-4 flex-1">
              <div className="text-5xl mb-4">{tutorialPasos[tutorialStep].icon}</div>
              <h3 className="text-[18px] font-bold text-[#1f1f1f] mb-2">{tutorialPasos[tutorialStep].title}</h3>
              <p className="text-[13px] text-[#9a9590] leading-relaxed mb-4">{tutorialPasos[tutorialStep].desc}</p>
              <div className="border-t border-[#f0ebe0] pt-4 space-y-2.5">
                {tutorialPasos[tutorialStep].tips.map((tip, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#ede9ff] flex items-center justify-center flex-shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#5a4bc3" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <p className="text-[13px] text-[#403c37]">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Dato destacado */}
            <div className="rounded-[14px] bg-[#ede9ff] border border-[#c8bbf5] px-4 py-3 mb-5 flex items-center gap-3">
              <p className="text-[22px] font-bold text-[#5a4bc3] flex-shrink-0">{tutorialPasos[tutorialStep].dato.numero}</p>
              <p className="text-[12px] text-[#3d2fa0] leading-snug">{tutorialPasos[tutorialStep].dato.texto}</p>
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-2 mb-5">
              {tutorialPasos.map((_, i) => (
                <div key={i} className={`h-2 rounded-full transition-all ${i === tutorialStep ? 'bg-[#5a4bc3] w-6' : 'bg-[#c8bbf5] w-2'}`} />
              ))}
            </div>

            <button onClick={() => {
              if (tutorialStep < tutorialPasos.length - 1) setTutorialStep(t => t + 1)
              else router.push('/dashboard')
            }} className="w-full bg-[#5a4bc3] text-white rounded-[16px] py-4 font-bold text-[16px]">
              {tutorialStep < tutorialPasos.length - 1 ? 'Entendido, siguiente →' : '¡Empezar a usar Finti! 🚀'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}