'use client'
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
      // Si ya tiene perfil completo, ir al dashboard
      const { data: profile } = await supabase
        .from('profiles')
        .select('monthly_income, salary_day')
        .eq('id', user.id)
        .single()
      if (profile?.monthly_income && profile?.salary_day) {
        router.push('/dashboard')
      }
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
    setStep(3) // tutorial
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'ahí'

  const tutorialPasos = [
    { icon: '📊', title: 'Registra tus gastos', desc: 'Agrega cada gasto del día. La IA los categoriza automáticamente para darte un análisis real de tus hábitos.' },
    { icon: '🎯', title: 'Crea metas de ahorro', desc: 'Define hacia dónde quieres llegar — un viaje, un fondo de emergencia, lo que sea. Te ayudamos a llegar.' },
    { icon: '📈', title: 'Invierte con confianza', desc: 'Conoce opciones de inversión adaptadas al contexto peruano: fondos mutuos, depósitos a plazo y más.' },
    { icon: '🤖', title: 'Tu asesor IA siempre disponible', desc: 'Pregúntale cualquier cosa sobre finanzas. Conoce tus datos y te da consejos personalizados en tiempo real.' },
  ]

  return (
    <div className="min-h-screen bg-[#f5f3ee] flex flex-col">

      {/* PASO 0: Bienvenida */}
      {step === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-[24px] bg-[#5a4bc3] flex items-center justify-center mb-6 shadow-lg">
            <span className="text-4xl">💜</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1f1f1f] mb-2">Hola, {firstName} 👋</h1>
          <p className="text-[#5d594f] text-[15px] leading-relaxed mb-8">
            Bienvenido a <span className="font-bold text-[#5a4bc3]">Finti</span>, tu gestor financiero inteligente.<br/>
            En 2 minutos tendrás todo listo.
          </p>
          <button
            onClick={() => setStep(1)}
            className="w-full max-w-xs bg-[#5a4bc3] text-white rounded-[16px] py-4 font-bold text-[16px]"
          >
            Empezar →
          </button>
        </div>
      )}

      {/* PASO 1: Ingreso y día de cobro */}
      {step === 1 && (
        <div className="flex-1 flex flex-col px-6 pt-12">
          <div className="mb-8">
            <p className="text-[12px] font-bold text-[#5a4bc3] uppercase tracking-widest mb-2">Paso 1 de 3</p>
            <h2 className="text-[22px] font-bold text-[#1f1f1f] mb-1">Tu ingreso mensual</h2>
            <p className="text-[14px] text-[#5d594f]">Esto nos ayuda a calcular tu presupuesto y alertas de gasto.</p>
          </div>

          <div className="space-y-4 mb-8">
            <div>
              <label className="text-[13px] font-semibold text-[#47433d] mb-2 block">¿Cuánto ganas al mes? (S/)</label>
              <input
                type="number"
                placeholder="Ej: 2500"
                value={ingreso}
                onChange={e => setIngreso(e.target.value)}
                className="w-full rounded-[14px] border border-[#e2decb] bg-white px-4 py-4 text-[16px] font-semibold focus:outline-none focus:border-[#5a4bc3]"
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-[#47433d] mb-2 block">¿Qué día del mes cobras?</label>
              <input
                type="number"
                min="1"
                max="31"
                placeholder="Ej: 15"
                value={diaCobro}
                onChange={e => setDiaCobro(e.target.value)}
                className="w-full rounded-[14px] border border-[#e2decb] bg-white px-4 py-4 text-[16px] font-semibold focus:outline-none focus:border-[#5a4bc3]"
              />
            </div>
          </div>

          <button
            onClick={() => ingreso && diaCobro && setStep(2)}
            disabled={!ingreso || !diaCobro}
            className="w-full bg-[#5a4bc3] text-white rounded-[16px] py-4 font-bold text-[16px] disabled:opacity-40"
          >
            Continuar →
          </button>
        </div>
      )}

      {/* PASO 2: Primer sueldo */}
      {step === 2 && (
        <div className="flex-1 flex flex-col px-6 pt-12">
          <div className="mb-8">
            <p className="text-[12px] font-bold text-[#5a4bc3] uppercase tracking-widest mb-2">Paso 2 de 3</p>
            <h2 className="text-[22px] font-bold text-[#1f1f1f] mb-1">¿Eres nuevo en finanzas?</h2>
            <p className="text-[14px] text-[#5d594f]">Te activamos el plan 50/30/20 para que empieces con el pie derecho.</p>
          </div>

          <div className="space-y-3 mb-6">
            <button
              onClick={() => setEsPrimerSueldo(true)}
              className={`w-full rounded-[16px] border-2 p-4 text-left transition-all ${esPrimerSueldo === true ? 'border-[#5a4bc3] bg-[#ede9ff]' : 'border-[#e2decb] bg-white'}`}
            >
              <p className="font-bold text-[#1f1f1f]">⚡ Sí, activa el modo primer sueldo</p>
              <p className="text-[13px] text-[#5d594f] mt-1">Te mostramos cómo dividir tu ingreso: 50% necesidades, 30% gustos, 20% ahorro.</p>
            </button>
            <button
              onClick={() => setEsPrimerSueldo(false)}
              className={`w-full rounded-[16px] border-2 p-4 text-left transition-all ${esPrimerSueldo === false ? 'border-[#5a4bc3] bg-[#ede9ff]' : 'border-[#e2decb] bg-white'}`}
            >
              <p className="font-bold text-[#1f1f1f]">📊 No, ya manejo mis finanzas</p>
              <p className="text-[13px] text-[#5d594f] mt-1">Ir directo al dashboard completo.</p>
            </button>
          </div>

          {esPrimerSueldo === true && (
            <div className="rounded-[16px] bg-[#ede9ff] border border-[#c8bbf5] p-4 mb-6">
              <p className="text-[13px] font-bold text-[#3d2fa0] mb-3">Personaliza tu plan</p>
              {[
                { label: 'Necesidades', value: needsPct, set: setNeedsPct, color: '#22c55e' },
                { label: 'Gustos', value: wantsPct, set: setWantsPct, color: '#f1a22e' },
                { label: 'Ahorro', value: savingsPct, set: setSavingsPct, color: '#5a4bc3' },
              ].map(item => (
                <div key={item.label} className="mb-3">
                  <div className="flex justify-between text-[13px] mb-1">
                    <span className="text-[#3d2fa0] font-medium">{item.label}</span>
                    <span className="font-bold" style={{ color: item.color }}>{item.value}% — S/{Math.round(parseFloat(ingreso || '0') * item.value / 100)}</span>
                  </div>
                  <input type="range" min="0" max="100" value={item.value}
                    onChange={e => {
                      item.set(parseInt(e.target.value))
                    }}
                    className="w-full accent-[#5a4bc3]"
                  />
                </div>
              ))}
              <p className="text-[12px] text-[#6b5fc0] text-center">Total: {needsPct + wantsPct + savingsPct}% {needsPct + wantsPct + savingsPct !== 100 ? '⚠️ debe sumar 100%' : '✅'}</p>
            </div>
          )}

          <button
            onClick={guardarYContinuar}
            disabled={esPrimerSueldo === null || guardando || (esPrimerSueldo && needsPct + wantsPct + savingsPct !== 100)}
            className="w-full bg-[#5a4bc3] text-white rounded-[16px] py-4 font-bold text-[16px] disabled:opacity-40"
          >
            {guardando ? 'Guardando...' : 'Continuar →'}
          </button>
        </div>
      )}

      {/* PASO 3: Tutorial */}
      {step === 3 && (
        <div className="flex-1 flex flex-col px-6 pt-12">
          <div className="mb-8">
            <p className="text-[12px] font-bold text-[#5a4bc3] uppercase tracking-widest mb-2">Paso 3 de 3</p>
            <h2 className="text-[22px] font-bold text-[#1f1f1f] mb-1">¿Cómo funciona Finti?</h2>
          </div>

          <div className="flex-1">
            <div className="rounded-[22px] bg-white border border-[#e2decb] p-6 mb-6">
              <div className="text-5xl mb-4">{tutorialPasos[tutorialStep].icon}</div>
              <h3 className="text-[18px] font-bold text-[#1f1f1f] mb-2">{tutorialPasos[tutorialStep].title}</h3>
              <p className="text-[14px] text-[#5d594f] leading-relaxed">{tutorialPasos[tutorialStep].desc}</p>
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-2 mb-8">
              {tutorialPasos.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === tutorialStep ? 'bg-[#5a4bc3] w-6' : 'bg-[#c8bbf5]'}`} />
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              if (tutorialStep < tutorialPasos.length - 1) {
                setTutorialStep(t => t + 1)
              } else {
                router.push('/dashboard')
              }
            }}
            className="w-full bg-[#5a4bc3] text-white rounded-[16px] py-4 font-bold text-[16px]"
          >
            {tutorialStep < tutorialPasos.length - 1 ? 'Entendido, siguiente →' : '¡Empezar a usar Finti! 🚀'}
          </button>
        </div>
      )}

    </div>
  )
}
