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
      <div className="bg-[#5a4bc3] px-6 pt-16 pb-12 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-[24px] bg-white/20 flex items-center justify-center mb-5">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <polyline points="4,36 14,20 22,28 32,10 40,18" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="36" cy="8" r="4" fill="#FCD34D"/>
            <circle cx="8" cy="38" r="3" fill="#22C55E"/>
          </svg>
        </div>
        <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 mb-4">
          <div className="w-2 h-2 rounded-full bg-[#a8f5c0]"/>
          <span className="text-[12px] text-[#ede9ff] font-medium">Para jóvenes peruanos</span>
        </div>
        <h1 className="text-[42px] font-bold text-white tracking-tight mb-2">Finti</h1>
        <p className="text-[16px] text-[#cfc6ff] mb-3 leading-relaxed">Tu primer gestor financiero inteligente</p>
        <p className="text-[13px] text-[#a89ef5] mb-8">Controla tus gastos, alcanza tus metas y empieza a invertir desde S/50</p>
        <Link href="/login" className="w-full max-w-xs bg-white text-[#5a4bc3] rounded-[18px] py-4 text-[15px] font-bold text-center block">
          Empieza gratis →
        </Link>
        <p className="text-[12px] text-[#a89ef5] mt-3">Sin tarjeta de crédito · 100% gratis</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 border-b border-[#ebe6db]">
        {[
          { value: 'S/150', label: 'ahorro mensual promedio' },
          { value: '3 min', label: 'para tu primer gasto' },
          { value: 'IA', label: 'análisis personalizado' },
        ].map((s, i) => (
          <div key={i} className={`bg-white py-4 px-2 text-center ${i !== 2 ? 'border-r border-[#ebe6db]' : ''}`}>
            <p className="text-[18px] font-bold text-[#5a4bc3]">{s.value}</p>
            <p className="text-[10px] text-[#8c887d] mt-1 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="px-5 py-8 flex flex-col gap-3">
        <p className="text-[11px] font-bold text-[#8c887d] tracking-widest uppercase text-center mb-2">Todo lo que necesitas</p>
        {[
          { emoji: '💸', title: 'Control de gastos', desc: 'Registra con foto de boleta, manual o importando del banco. En soles y dólares.', bg: '#ede9ff' },
          { emoji: '🎯', title: 'Metas de ahorro', desc: 'Define metas con fecha límite. La IA te dice cuánto ahorrar por mes para llegar.', bg: '#e0fdf4' },
          { emoji: '📈', title: 'Inversiones', desc: 'Registra fondos mutuos, depósitos y acciones. Ve tu proyección a 5 años.', bg: '#fef3c7' },
          { emoji: '✨', title: 'Asesor IA 24/7', desc: 'Pregúntale cualquier cosa sobre tus finanzas. Responde con tus datos reales.', bg: '#5a4bc3', dark: true },
        ].map(f => (
          <div key={f.title} className={`rounded-[20px] p-4 flex items-start gap-3 border ${f.dark ? 'bg-[#5a4bc3] border-[#5a4bc3]' : 'bg-white border-[#ebe6db]'}`}>
            <div className="w-11 h-11 rounded-[13px] flex items-center justify-center text-xl flex-shrink-0" style={{background: f.dark ? 'rgba(255,255,255,0.2)' : f.bg}}>
              {f.emoji}
            </div>
            <div>
              <p className={`text-[15px] font-bold mb-1 ${f.dark ? 'text-white' : 'text-[#1f1f1f]'}`}>{f.title}</p>
              <p className={`text-[13px] leading-relaxed ${f.dark ? 'text-[#cfc6ff]' : 'text-[#8c887d]'}`}>{f.desc}</p>
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
              'Hecho para la realidad peruana — BCP, Interbank, BBVA',
              'Gastos en soles y dólares en la misma app',
              'Instálala en tu celular como app — sin descargar nada',
              '100% gratis para empezar',
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
        <p className="text-[18px] font-bold text-[#1f1f1f] mb-2">¿Listo para ordenar tus finanzas?</p>
        <p className="text-[13px] text-[#8c887d] mb-5">Únete a jóvenes peruanos que ya controlan su dinero</p>
        <Link href="/login" className="block w-full bg-[#5a4bc3] text-white rounded-[18px] py-4 text-[15px] font-bold text-center">
          Crear mi cuenta gratis →
        </Link>
        <p className="text-[12px] text-[#8c887d] mt-4">support@usefinti.app</p>
      </div>

      {/* Footer */}
      <div className="pb-8 text-center">
        <div className="flex items-center justify-center gap-3 text-[11px] text-[#8c887d]">
          <a href="/privacidad.html" className="hover:text-[#5a4bc3]">Privacidad</a>
          <span>·</span>
          <a href="/terminos.html" className="hover:text-[#5a4bc3]">Términos</a>
        </div>
      </div>

    </div>
  )
}