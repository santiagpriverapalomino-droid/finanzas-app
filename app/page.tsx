'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function LandingPage() {
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: prof } = await supabase.from('profiles').select('monthly_income, salary_day').eq('id', session.user.id).single()
        if (prof?.monthly_income && prof?.salary_day) {
          router.push('/dashboard')
        } else {
          router.push('/onboarding')
        }
      }
    }
    check()
  }, [])

  return (
    <div className="min-h-screen bg-[#f5f3ee] flex flex-col">

      {/* Hero */}
      <div className="bg-[#3d2f9f] px-6 pt-16 pb-12 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-[24px] bg-white/20 flex items-center justify-center mb-5">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <polyline points="4,36 14,20 22,28 32,10 40,18" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="36" cy="8" r="4" fill="#FCD34D"/>
            <circle cx="8" cy="38" r="3" fill="#22C55E"/>
          </svg>
        </div>
        <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 mb-4">
          <div className="w-2 h-2 rounded-full bg-[#4ade80]"/>
          <span className="text-[12px] text-white/80 font-medium">Para jóvenes peruanos con su primer sueldo</span>
        </div>
        <h1 className="text-[42px] font-bold text-white tracking-tight mb-2">Finti</h1>
        <p className="text-[18px] text-white font-semibold mb-3 leading-relaxed">Tu plata, organizada sola</p>
        <p className="text-[14px] text-white/70 mb-8 leading-relaxed max-w-xs">Conecta tu Gmail y Finti importa automáticamente tus gastos del BCP y Yape — sin escribir nada.</p>
        <Link href="/login" className="w-full max-w-xs bg-white text-[#3d2f9f] rounded-[18px] py-4 text-[15px] font-bold text-center block">
          Empieza gratis →
        </Link>
        <p className="text-[12px] text-white/50 mt-3">Sin tarjeta de crédito · Listo en 2 minutos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 border-b border-[#ebe6db]">
        {[
          { value: 'BCP + Yape', label: 'automático' },
          { value: 'IA', label: 'asesor 24/7' },
          { value: 'S/0', label: 'para empezar' },
        ].map((s, i) => (
          <div key={i} className={`bg-white py-4 px-2 text-center ${i !== 2 ? 'border-r border-[#ebe6db]' : ''}`}>
            <p className="text-[15px] font-bold text-[#3d2f9f]">{s.value}</p>
            <p className="text-[10px] text-[#8c887d] mt-1 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="px-5 py-8 flex flex-col gap-3">
        <p className="text-[11px] font-bold text-[#8c887d] tracking-widest uppercase text-center mb-2">Todo lo que necesitas</p>
        {[
          { emoji: '💳', title: 'Tu banco en automático', desc: 'La primera app peruana que lee tus notificaciones del BCP y Yape para registrar tus gastos solos. Sin escribir nada.', bg: '#ede9ff' },
          { emoji: '🤖', title: 'Asesor IA que te conoce', desc: 'Pregúntale cualquier cosa sobre tu plata. Conoce tus gastos reales y te responde en segundos con contexto peruano.', bg: '#3d2f9f', dark: true },
          { emoji: '🎯', title: 'Ahorra con un objetivo', desc: 'Crea metas con fecha límite. El simulador IA te dice exactamente cuánto ahorrar por mes para llegar.', bg: '#e0fdf4' },
          { emoji: '📈', title: 'Invierte cuando estés listo', desc: 'Desbloquea inversiones después de 14 días registrando gastos. Empieza desde S/50 en fondos mutuos.', bg: '#fef3c7' },
        ].map(f => (
          <div key={f.title} className={`rounded-[20px] p-4 flex items-start gap-3 border ${f.dark ? 'bg-[#3d2f9f] border-[#3d2f9f]' : 'bg-white border-[#ebe6db]'}`}>
            <div className="w-11 h-11 rounded-[13px] flex items-center justify-center text-xl flex-shrink-0" style={{background: f.dark ? 'rgba(255,255,255,0.15)' : f.bg}}>
              {f.emoji}
            </div>
            <div>
              <p className={`text-[15px] font-bold mb-1 ${f.dark ? 'text-white' : 'text-[#1f1f1f]'}`}>{f.title}</p>
              <p className={`text-[13px] leading-relaxed ${f.dark ? 'text-white/70' : 'text-[#8c887d]'}`}>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Por qué Finti */}
      <div className="px-5 pb-8">
        <div className="bg-white rounded-[20px] border border-[#ebe6db] p-5">
          <p className="text-[11px] font-bold text-[#8c887d] tracking-widest uppercase mb-4">Por qué Finti</p>
          <div className="flex flex-col gap-3">
            {[
              'Hecho para el peruano — BCP, Yape, soles',
              'App peruana que importa gastos automáticamente desde tu Gmail',
              'Asesor financiero con IA disponible 24/7',
              'Modo oscuro y temas personalizables',
              'Instálala en tu celular como app — sin descargar nada',
              '100% gratis para empezar',
              'Tus datos encriptados — nunca vendemos tu información',
              'Acceso de solo lectura a Gmail — no lee tus conversaciones',
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#22c55e] flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <p className="text-[13px] text-[#47433d]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA final */}
      <div className="px-5 pb-12 text-center">
        <p className="text-[18px] font-bold text-[#1f1f1f] mb-2">¿Listo para controlar tu plata?</p>
        <p className="text-[13px] text-[#8c887d] mb-5">Únete a jóvenes peruanos que ya no se preguntan en qué gastaron.</p>
        <p className="text-[12px] text-[#8c887d] mt-3">
  <a href="/seguridad.html" className="text-[#3d2f9f] font-medium">🔒 Ver cómo protegemos tus datos</a>
</p>
        <Link href="/login" className="block w-full bg-[#3d2f9f] text-white rounded-[18px] py-4 text-[15px] font-bold text-center">
          Crear mi cuenta gratis →
        </Link>
        <p className="text-[12px] text-[#8c887d] mt-4">support@usefinti.app</p>
      </div>

      {/* Footer */}
      <div className="pb-8 text-center">
        <div className="flex items-center justify-center gap-3 text-[11px] text-[#8c887d]">
          <a href="/privacidad.html" className="hover:text-[#3d2f9f]">Privacidad</a>
          <span>·</span>
          <a href="/terminos.html" className="hover:text-[#3d2f9f]">Términos</a>
        </div>
      </div>

    </div>
  )
}