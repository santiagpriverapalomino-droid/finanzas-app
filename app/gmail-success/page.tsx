'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function GmailSuccess() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/gastos?gmail=connected')
    }, 1500)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-[#f5f3ee] flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-full bg-[#22c55e] flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <p className="text-[18px] font-bold text-[#1f1f1f]">¡Gmail conectado!</p>
      <p className="text-[14px] text-[#8c887d]">Redirigiendo a tus gastos...</p>
    </div>
  )
}