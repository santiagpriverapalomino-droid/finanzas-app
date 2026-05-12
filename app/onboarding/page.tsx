'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Onboarding() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [step, setStep] = useState(0)
  const [prevStep, setPrevStep] = useState(-1)
  const [animating, setAnimating] = useState(false)
  const [ingreso, setIngreso] = useState('')
  const [diaCobro, setDiaCobro] = useState('')
  const [esPrimerSueldo, setEsPrimerSueldo] = useState<boolean | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [featuresVisible, setFeaturesVisible] = useState<boolean[]>([])

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'ahí'

  const features = [
    { icon: '💳', title: 'Tu banco, automático', desc: 'Conecta tu Gmail y los gastos del BCP aparecen solos — sin escribir nada.', locked: false },
    { icon: '📊', title: 'Sabe en qué gastas', desc: 'Ve exactamente a dónde va tu plata cada mes con gráficas claras.', locked: false },
    { icon: '🎯', title: 'Ahorra con un objetivo', desc: 'Crea metas y el simulador IA te dice cuánto ahorrar por mes para llegar.', locked: false },
    { icon: '🤖', title: 'Tu asesor financiero', desc: 'Pregúntale cualquier cosa sobre tu plata. Conoce tu situación y responde al instante.', locked: false },
    { icon: '📈', title: 'Invierte tu dinero', desc: 'Desbloquea inversiones al llegar a 14 días seguidos registrando gastos.', locked: true },
  ]

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

  useEffect(() => {
    if (step === 0) {
      setFeaturesVisible([])
      features.forEach((_, i) => {
        setTimeout(() => {
          setFeaturesVisible(prev => {
            const next = [...prev]
            next[i] = true
            return next
          })
        }, 300 + i * 120)
      })
    }
  }, [step])

  const goToStep = (nextStep: number) => {
    if (animating) return
    setAnimating(true)
    setPrevStep(step)
    setTimeout(() => {
      setStep(nextStep)
      setAnimating(false)
    }, 300)
  }

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
    goToStep(2)
  }

  const slideClass = animating ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'

  return (
    <div className="min-h-screen bg-[#f5f3ee] flex flex-col overflow-hidden">

      {/* ── PASO 0: Bienvenida ── */}
      {step === 0 && (
        <div className={`flex-1 flex flex-col transition-all duration-300 ${slideClass}`}>
          <div className="bg-[#3d2f9f] px-6 pt-16 pb-12">
            <div className="w-16 h-16 rounded-[20px] bg-white/15 flex items-center justify-center mb-5"
              style={{animation: 'bounceIn 0.6s ease-out'}}>
              <svg width="36" height="36" viewBox="0 0 44 44" fill="none">
                <polyline points="4,36 14,20 22,28 32,10 40,18" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="36" cy="8" r="4" fill="#FCD34D"/>
                <circle cx="8" cy="38" r="3" fill="#4ade80"/>
              </svg>
            </div>
            <h1 className="text-[28px] font-bold text-white mb-2"
              style={{animation: 'fadeInUp 0.5s ease-out 0.2s both'}}>
              Hola, {firstName} 👋
            </h1>
            <p className="text-[15px] text-white/70 leading-relaxed"
              style={{animation: 'fadeInUp 0.5s ease-out 0.35s both'}}>
              Bienvenido a <span className="font-bold text-white">Finti</span> — tu asesor financiero inteligente para jóvenes peruanos.
            </p>
          </div>

          <div className="bg-[#f5f3ee] rounded-t-[28px] -mt-5 px-6 pt-6 pb-10 flex-1 flex flex-col">
            <p className="text-[13px] font-bold text-[#9a9590] uppercase tracking-wide mb-4"
              style={{animation: 'fadeInUp 0.5s ease-out 0.4s both'}}>
              Esto es lo que vas a poder hacer
            </p>
            <div className="space-y-3 flex-1">
              {features.map((f, i) => (
                <div key={f.title}
                  className={`flex items-start gap-3 rounded-[16px] px-4 py-3 border transition-all duration-500 ${
                    f.locked ? 'bg-[#f7f4ed] border-[#e5dfd5] opacity-70' : 'bg-white border-[#ebe6db]'
                  } ${featuresVisible[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                  style={{transitionDelay: `${i * 50}ms`}}>
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
            <button onClick={() => goToStep(1)}
              className="w-full bg-[#5a4bc3] text-white rounded-[16px] py-4 font-bold text-[16px] mt-6 active:scale-95 transition-transform"
              style={{animation: 'fadeInUp 0.5s ease-out 1s both'}}>
              Empezar 🚀
            </button>
            <p className="text-center text-[12px] text-[#9a9590] mt-3"
              style={{animation: 'fadeInUp 0.5s ease-out 1.1s both'}}>
              100% gratis · Sin tarjeta de crédito
            </p>
            <a href="/seguridad.html" target="_blank" className="text-center text-[11px] text-[#9a9590] mt-1 block"
              style={{animation: 'fadeInUp 0.5s ease-out 1.2s both'}}>
              🔒 Cómo protegemos tus datos
            </a>
          </div>
        </div>
      )}

      {/* ── PASO 1: Ingreso + primer sueldo ── */}
      {step === 1 && (
        <div className={`flex-1 flex flex-col transition-all duration-300 ${slideClass}`}>
          <div className="bg-[#3d2f9f] px-6 pt-16 pb-12">
            <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-3"
              style={{animation: 'fadeInUp 0.4s ease-out both'}}>
              Paso 1 de 1
            </p>
            <h2 className="text-[26px] font-bold text-white mb-2"
              style={{animation: 'fadeInUp 0.4s ease-out 0.1s both'}}>
              Cuéntanos sobre ti
            </h2>
            <p className="text-[14px] text-white/70"
              style={{animation: 'fadeInUp 0.4s ease-out 0.2s both'}}>
              Solo necesitamos 3 datos para personalizar tu experiencia.
            </p>
          </div>

          <div className="bg-[#f5f3ee] rounded-t-[28px] -mt-5 px-6 pt-6 pb-10 flex-1 flex flex-col overflow-y-auto">
            <div className="space-y-4 flex-1">
              <div style={{animation: 'fadeInUp 0.4s ease-out 0.2s both'}}>
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

              <div style={{animation: 'fadeInUp 0.4s ease-out 0.3s both'}}>
                <label className="text-[12px] font-bold uppercase tracking-wide text-[#9a9590] mb-2 block">¿Qué día del mes cobras?</label>
                <input type="number" min="1" max="31" placeholder="Ej: 15" value={diaCobro}
                  onChange={e => setDiaCobro(e.target.value)}
                  className="w-full rounded-[16px] border border-[#ebe6db] bg-white px-4 py-4 text-[18px] font-bold outline-none focus:border-[#5a4bc3] text-[#1f1f1f]"/>
              </div>

              <div style={{animation: 'fadeInUp 0.4s ease-out 0.4s both'}}>
                <label className="text-[12px] font-bold uppercase tracking-wide text-[#9a9590] mb-2 block">¿Es tu primer sueldo?</label>
                <div className="space-y-2">
                  <button onClick={() => setEsPrimerSueldo(true)}
                    className={`w-full rounded-[16px] border-2 p-4 text-left transition-all active:scale-98 ${esPrimerSueldo === true ? 'border-[#5a4bc3] bg-[#ede9ff]' : 'border-[#ebe6db] bg-white'}`}>
                    <p className="font-bold text-[#1f1f1f] text-[14px]">⚡ Sí, es mi primer sueldo</p>
                    <p className="text-[12px] text-[#9a9590] mt-0.5">Activamos el plan 50/30/20 para ayudarte a distribuir tu ingreso.</p>
                  </button>
                  <button onClick={() => setEsPrimerSueldo(false)}
                    className={`w-full rounded-[16px] border-2 p-4 text-left transition-all active:scale-98 ${esPrimerSueldo === false ? 'border-[#5a4bc3] bg-[#ede9ff]' : 'border-[#ebe6db] bg-white'}`}>
                    <p className="font-bold text-[#1f1f1f] text-[14px]">💼 No, ya manejo mis finanzas</p>
                    <p className="text-[12px] text-[#9a9590] mt-0.5">Ir directo a mi resumen completo.</p>
                  </button>
                </div>
              </div>

              {esPrimerSueldo === true && ingreso && (
                <div className="rounded-[16px] bg-[#ede9ff] border border-[#c8bbf5] p-4"
                  style={{animation: 'fadeInUp 0.4s ease-out both'}}>
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
                  <p className="text-[11px] text-[#6b5fc0] mt-2">Puedes ajustar estos porcentajes en Ajustes cuando quieras.</p>
                </div>
              )}
            </div>

            <button onClick={guardarYContinuar}
              disabled={!ingreso || !diaCobro || esPrimerSueldo === null || guardando}
              className="w-full bg-[#5a4bc3] text-white rounded-[16px] py-4 font-bold text-[16px] disabled:opacity-40 mt-6 active:scale-95 transition-transform">
              {guardando ? 'Guardando...' : 'Listo, empezar →'}
            </button>
          </div>
        </div>
      )}

      {/* ── PASO 2: Listo ── */}
      {step === 2 && (
        <div className={`flex-1 flex flex-col transition-all duration-300 ${slideClass}`}>
          <div className="bg-[#3d2f9f] px-6 pt-16 pb-12">
            <div className="w-16 h-16 rounded-[20px] bg-white/15 flex items-center justify-center mb-5 text-4xl"
              style={{animation: 'bounceIn 0.6s ease-out both'}}>
              🎉
            </div>
            <h2 className="text-[26px] font-bold text-white mb-2"
              style={{animation: 'fadeInUp 0.4s ease-out 0.2s both'}}>
              Todo listo, {firstName}
            </h2>
            <p className="text-[14px] text-white/70"
              style={{animation: 'fadeInUp 0.4s ease-out 0.3s both'}}>
              Ya puedes empezar a ordenar tu plata con Finti.
            </p>
          </div>

          <div className="bg-[#f5f3ee] rounded-t-[28px] -mt-5 px-6 pt-6 pb-10 flex-1 flex flex-col">
            <div className="space-y-3 flex-1">
              <div className="rounded-[18px] bg-white border border-[#ebe6db] p-5"
                style={{animation: 'fadeInUp 0.4s ease-out 0.3s both'}}>
                <p className="text-[14px] font-bold text-[#1f1f1f] mb-3">Tu primer paso 👇</p>
                <div className="space-y-3">
                  {[
                    'Conecta tu Gmail para importar gastos del BCP automáticamente',
                    'Registra tu primer gasto del día de hoy',
                    'Pregúntale algo a Finti IA sobre tus finanzas'
                  ].map((txt, i) => (
                    <div key={i} className="flex items-center gap-3"
                      style={{animation: `fadeInUp 0.4s ease-out ${0.4 + i * 0.1}s both`}}>
                      <div className="w-8 h-8 rounded-full bg-[#ede9ff] flex items-center justify-center text-sm font-bold text-[#5a4bc3] flex-shrink-0">{i+1}</div>
                      <p className="text-[13px] text-[#47433d]">{txt}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="rounded-[18px] bg-[#ede9ff] border border-[#c8bbf5] p-4 flex items-center gap-3"
                style={{animation: 'fadeInUp 0.4s ease-out 0.7s both'}}>
                <span className="text-2xl">🔒</span>
                <div>
                  <p className="text-[13px] font-bold text-[#3d2fa0]">Inversiones — se desbloquea en 14 días</p>
                  <p className="text-[12px] text-[#6b5fc0]">Registra gastos 14 días seguidos y desbloqueas la pantalla de inversiones.</p>
                </div>
              </div>
            </div>

            <button onClick={() => router.push('/dashboard')}
              className="w-full bg-[#5a4bc3] text-white rounded-[16px] py-4 font-bold text-[16px] mt-6 active:scale-95 transition-transform"
              style={{animation: 'fadeInUp 0.4s ease-out 0.8s both'}}>
              ¡Ver mi resumen! 🚀
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.5); }
          60% { transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}