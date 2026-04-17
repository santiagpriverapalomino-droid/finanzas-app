'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from './supabase'

type Currency = 'PEN' | 'USD'

interface CurrencyContextType {
  currency: Currency
  setCurrency: (c: Currency) => void
  fmt: (v: number) => string
  symbol: string
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'PEN',
  setCurrency: () => {},
  fmt: (v) => `S/${Math.abs(v).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
  symbol: 'S/',
})

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('PEN')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('main_currency').eq('id', user.id).single()
      if (prof?.main_currency) setCurrencyState(prof.main_currency as Currency)
    }
    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load())
    return () => subscription.unsubscribe()
  }, [])

  const setCurrency = (c: Currency) => setCurrencyState(c)

  const symbol = currency === 'USD' ? '$' : 'S/'
  const locale = currency === 'USD' ? 'en-US' : 'es-PE'

  const fmt = (v: number) =>
    `${symbol}${Math.abs(v).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, fmt, symbol }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrency = () => useContext(CurrencyContext)