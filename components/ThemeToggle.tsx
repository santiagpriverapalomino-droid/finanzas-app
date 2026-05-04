'use client'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('finti-theme')
    setDark(saved === 'dark')
  }, [])

  const toggle = () => {
    const newDark = !dark
    setDark(newDark)
    if (newDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('finti-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('finti-theme', 'light')
    }
  }

  return (
    <button onClick={toggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${dark ? 'bg-[#5a4bc3]' : 'bg-[#ddd7cc]'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${dark ? 'translate-x-6' : 'translate-x-1'}`}/>
    </button>
  )
}