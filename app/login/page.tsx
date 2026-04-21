'use client'
import { supabase } from '../../lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: prof } = await supabase.from('profiles').select('monthly_income, salary_day').eq('id', session.user.id).single()
        if (prof?.monthly_income && prof?.salary_day) {
          router.push('/dashboard')
        } else {
          router.push('/onboarding')
        }
      } else {
        setChecking(false)
      }
    }
    checkSession()
  }, [])

  const loginConGoogle = async () => {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/onboarding`
      }
    })
  }

  if (checking) return (
    <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-[20px] bg-[#5a4bc3] flex items-center justify-center">
          <svg width="36" height="36" viewBox="0 0 44 44" fill="none">
            <polyline points="4,36 14,20 22,28 32,10 40,18" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="36" cy="8" r="4" fill="#FCD34D"/>
          </svg>
        </div>
        <div className="w-6 h-6 border-2 border-[#5a4bc3] border-t-transparent rounded-full animate-spin"/>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f5f3ee] flex flex-col items-center justify-center px-6">

      {/* Logo */}
      <div className="w-[72px] h-[72px] rounded-[20px] bg-[#5a4bc3] flex items-center justify-center mb-4">
        <svg width="40" height="40" viewBox="0 0 44 44" fill="none">
          <polyline points="4,36 14,20 22,28 32,10 40,18" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="36" cy="8" r="4" fill="#FCD34D"/>
          <circle cx="8" cy="38" r="3" fill="#22C55E"/>
        </svg>
      </div>

      <h1 className="text-[28px] font-bold text-[#5a4bc3] mb-1">Bienvenido a Finti</h1>
      <p className="text-[14px] text-[#8c887d] mb-10 text-center">Inicia sesión para continuar</p>

      <div className="w-full max-w-xs flex flex-col gap-3">
        <button onClick={loginConGoogle} disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-[#e2decb] rounded-[18px] py-4 text-[15px] font-semibold text-[#1f1f1f] active:scale-95 transition-transform disabled:opacity-50">
          <svg width="20" height="20" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
          </svg>
          {loading ? 'Entrando...' : 'Continuar con Google'}
        </button>

        <button disabled className="w-full flex items-center justify-center gap-3 bg-white border border-[#e2decb] rounded-[18px] py-4 text-[15px] font-semibold text-[#8c887d] opacity-50">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
          Continuar con Apple
          <span className="text-[11px] bg-[#f3f0e8] px-2 py-0.5 rounded-full">Próximamente</span>
        </button>
      </div>

      <p className="text-[12px] text-[#8c887d] mt-8 text-center leading-relaxed">
        Al continuar aceptas nuestros<br/>
        <a href="/terminos.html" className="text-[#5a4bc3]">Términos</a> y <a href="/privacidad.html" className="text-[#5a4bc3]">Política de privacidad</a>
      </p>
    </div>
  )
}