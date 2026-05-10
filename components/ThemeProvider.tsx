'use client'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ThemeProvider() {
  useEffect(() => {
    const apply = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: prof } = await supabase.from('profiles').select('theme').eq('id', user.id).single()
        const theme = prof?.theme || 'purple'
        document.documentElement.classList.remove('theme-green', 'theme-blue', 'theme-black')
        if (theme !== 'purple') document.documentElement.classList.add(`theme-${theme}`)
      } catch {}
    }
    apply()
  }, [])
  return null
}