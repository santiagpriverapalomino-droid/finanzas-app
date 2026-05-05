'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [inversionesBloqueadas, setInversionesBloqueadas] = useState(false)
  const [racha, setRacha] = useState(0)
  const [mostrarMensaje, setMostrarMensaje] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: prof } = await supabase.from('profiles').select('is_first_salary_mode').eq('id', user.id).single()
      if (!prof?.is_first_salary_mode) return // No es primer sueldo, todo disponible

      // Calcular racha
      const { data: allExp } = await supabase.from('expenses').select('date').eq('user_id', user.id).order('date', { ascending: false })
      if (!allExp || allExp.length === 0) { setInversionesBloqueadas(true); return }

      const uniqueDays = [...new Set(allExp.map((e: any) => e.date))].sort().reverse()
      let streak = 0
      const today = new Date()
      for (let i = 0; i < uniqueDays.length; i++) {
        const expected = new Date(today)
        expected.setDate(today.getDate() - i)
        const expectedStr = `${expected.getFullYear()}-${String(expected.getMonth()+1).padStart(2,'0')}-${String(expected.getDate()).padStart(2,'0')}`
        if (uniqueDays[i] === expectedStr) streak++
        else break
      }

      setRacha(streak)
      setInversionesBloqueadas(streak < 14)
    }
    init()
  }, [])

  const items = [
    {
      href: '/dashboard',
      label: 'Inicio',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
    },
    {
      href: '/gastos',
      label: 'Gastos',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
    },
    {
      href: '/metas',
      label: 'Metas',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
    },
    {
      href: '/inversiones',
      label: 'Inversiones',
      icon: inversionesBloqueadas
        ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
    },
  ]

  return (
    <>
      {mostrarMensaje && inversionesBloqueadas && (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm flex items-end" onClick={() => setMostrarMensaje(false)}>
          <div className="w-full bg-white rounded-t-[34px] p-6 pb-10" onClick={e => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[#ddd7cc]"/>
            <div className="text-center mb-4">
              <span className="text-5xl">🔒</span>
            </div>
            <h3 className="text-[18px] font-bold text-[#1f1f1f] text-center mb-2">Inversiones bloqueadas</h3>
            <p className="text-[14px] text-[#9a9590] text-center leading-relaxed mb-4">
              Registra gastos <span className="font-bold text-[#5a4bc3]">14 días seguidos</span> para desbloquear inversiones. Llevas <span className="font-bold text-[#5a4bc3]">{racha} {racha === 1 ? 'día' : 'días'}</span>.
            </p>
            <div className="h-2 rounded-full bg-[#ede9ff] mb-4 overflow-hidden">
              <div className="h-2 rounded-full bg-[#5a4bc3] transition-all" style={{width: `${Math.min(100, (racha/14)*100)}%`}}/>
            </div>
            <p className="text-[12px] text-[#9a9590] text-center mb-5">Faltan {14 - racha} días más</p>
            <button onClick={() => setMostrarMensaje(false)}
              className="w-full bg-[#5a4bc3] text-white rounded-[16px] py-3 font-bold text-[15px]">
              Entendido
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#ece8df] z-40">
        <div className="max-w-md mx-auto flex">
          {items.map(item => {
            const isActive = pathname === item.href
            const isInversiones = item.href === '/inversiones'

            if (isInversiones && inversionesBloqueadas) {
              return (
                <button key={item.href} onClick={() => setMostrarMensaje(true)}
                  className="flex-1 flex flex-col items-center py-3 gap-1 text-[#c8bbf5]">
                  {item.icon}
                  <span className="text-[11px] font-medium">Inversiones</span>
                </button>
              )
            }

            return (
              <Link key={item.href} href={item.href}
                className={`flex-1 flex flex-col items-center py-3 gap-1 ${isActive ? 'text-[#5a4bc3]' : 'text-[#8c887d]'}`}>
                {item.icon}
                <span className="text-[11px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}