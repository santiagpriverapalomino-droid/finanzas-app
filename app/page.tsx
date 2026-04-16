'use client'
import { supabase } from '../lib/supabase'
import { useState } from 'react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  const loginConGoogle = async () => {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/onboarding`
      }
    })
  }

  return (
    <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-[24px] bg-[#4C1D95] flex items-center justify-center mb-4 shadow-lg">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <polyline points="4,36 14,20 22,28 32,10 40,18" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="36" cy="8" r="4" fill="#FCD34D"/>
              <circle cx="8" cy="38" r="3" fill="#22C55E"/>
            </svg>
          </div>
          <h1 className="text-[32px] font-bold text-[#4C1D95] tracking-tight">Finti</h1>
          <p className="text-[15px] text-[#5d594f] mt-1 text-center">Tu gestor financiero inteligente</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[24px] border border-[#ebe6db] p-6 shadow-sm">
          <p className="text-[14px] text-[#8c887d] text-center mb-6">
            Controla tus gastos, ahorra más y toma mejores decisiones financieras con IA.
          </p>

          <button
            onClick={loginConGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 border border-[#e2decb] rounded-[16px] py-3.5 px-4 text-[15px] font-medium text-[#1f1f1f] hover:bg-[#f5f3ee] transition-colors disabled:opacity-50 mb-4"
          >
            <svg width="20" height="20" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
            </svg>
            {loading ? 'Entrando...' : 'Continuar con Google'}
          </button>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-px bg-[#ebe6db]"/>
            <span className="text-[12px] text-[#8c887d]">o</span>
            <div className="flex-1 h-px bg-[#ebe6db]"/>
          </div>

          <button disabled className="w-full flex items-center justify-center gap-3 border border-[#e2decb] rounded-[16px] py-3.5 px-4 text-[15px] font-medium text-[#8c887d] opacity-50 cursor-not-allowed">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            Continuar con Apple
            <span className="text-[11px] bg-[#f3f0e8] px-2 py-0.5 rounded-full">Próximamente</span>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-[12px] text-[#8c887d]">Gratis para siempre en el plan básico</p>
          <div className="flex items-center justify-center gap-3 text-[11px] text-[#8c887d]">
            <a href="/privacidad.html" className="hover:text-[#5a4bc3]">Privacidad</a>
            <span>·</span>
            <a href="/terminos.html" className="hover:text-[#5a4bc3]">Términos</a>
          </div>
        </div>

      </div>
    </div>
  )
}
