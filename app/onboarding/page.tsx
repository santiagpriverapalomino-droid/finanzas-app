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

      {/* PASO 0: Bienvenida */}
      {step === 0 && (
        <div className="flex-1 flex flex-col px-6 pt-12 pb-8">
          {/* Logo y saludo */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 rounded-[24px] bg-[#5a4bc3] flex items-center justify-center mb-4 shadow-lg">
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                <polyline points="4,36 14,20 22,28 32,10 40,18" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="36" cy="8" r="4" fill="#FCD34D"/>
                <circle cx="8" cy="38" r="3" fill="#22C55E"/>
              </svg>
            </div>
            <h1 className="text-[26px] font-bold text-[#1f1f1f] mb-2">Hola, {firstName} 👋</h1>
            <p className="text-[#5d594f] text-[15px] leading-relaxed">
              Bienvenido a <span className="font-bold text-[#5a4bc3]">Finti</span> — tu gestor financiero inteligente hecho para jóvenes peruanos.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-8">
            {[
              { icon: '🤖', title: 'Asesor IA personalizado', desc: 'Pregúntale cualquier cosa sobre finanzas. Conoce tus datos y te responde en segundos.' },
              { icon: '📸', title: 'Escanea tus boletas', desc: 'Saca foto a tu ticket y la IA registra el gasto automáticamente. Sin escribir nada.' },
              { icon: '🏦', title: 'Importa tu estado de cuenta', desc: 'Sube tu estado del BCP, BBVA o Interbank y tus gastos se importan solos.' },
              { icon: '📊', title: 'Dashboard completo', desc: 'Visualiza tus gastos, metas e inversiones en tiempo real con gráficas claras.' },
              { icon: '📄', title: 'Exporta en PDF', desc: 'Genera un reporte mensual de tus finanzas para tenerlo siempre a mano.' },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-4 bg-white rounded-[18px] px-4 py-3.5 border border-[#ebe6db]">
                <span className="text-2xl flex-shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-[14px] font-bold text-[#1f1f1f]">{f.title}</p>
                  <p className="text-[12px] text-[#8c887d] mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep(1)}
            className="w-full bg-[#5a4bc3] text-white rounded-[16px] py-4 font-bold text-[16px] shadow-lg">
            Empezar — son solo 2 minutos 🚀
          </button>
          <p className="text-center text-[12px] text-[#8c887d] mt-3">100% gratis · Sin tarjeta de crédito</p>
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
            <div className="rounded-[22px] bg-white border border-[#e2decb] p-6 mb-4">
  <div className="text-5xl mb-4">{tutorialPasos[tutorialStep].icon}</div>
  <h3 className="text-[18px] font-bold text-[#1f1f1f] mb-2">{tutorialPasos[tutorialStep].title}</h3>
  <p className="text-[14px] text-[#5d594f] leading-relaxed mb-4">{tutorialPasos[tutorialStep].desc}</p>
  <div className="border-t border-[#f0ebe0] pt-4 space-y-2">
    {tutorialPasos[tutorialStep].tips.map((tip, i) => (
      <div key={i} className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-[#ede9ff] flex items-center justify-center flex-shrink-0">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#5a4bc3" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <p className="text-[13px] text-[#47433d]">{tip}</p>
      </div>
    ))}
  </div>
</div>

<div className="rounded-[16px] bg-[#ede9ff] border border-[#c8bbf5] px-4 py-3 mb-6 flex items-center gap-3">
  <p className="text-[22px] font-bold text-[#5a4bc3] flex-shrink-0">{tutorialPasos[tutorialStep].dato.numero}</p>
  <p className="text-[13px] text-[#3d2fa0] leading-snug">{tutorialPasos[tutorialStep].dato.texto}</p>
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

