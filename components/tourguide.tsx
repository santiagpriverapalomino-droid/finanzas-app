'use client'
import { useState, useEffect } from 'react'

interface TourStep {
  target: string
  title: string
  message: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

interface TourGuideProps {
  tourKey: string
  steps: TourStep[]
}

export default function TourGuide({ tourKey, steps }: TourGuideProps) {
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [box, setBox] = useState<DOMRect | null>(null)

  useEffect(() => {
    const done = localStorage.getItem(`tour_${tourKey}`)
    if (!done) {
      setTimeout(() => setActive(true), 800)
    }
  }, [tourKey])

  useEffect(() => {
    if (!active) return
    const el = document.querySelector(`[data-tour="${steps[step]?.target}"]`)
    if (el) {
      setBox(el.getBoundingClientRect())
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [active, step])

  const next = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1)
    } else {
      finish()
    }
  }

  const finish = () => {
    localStorage.setItem(`tour_${tourKey}`, 'done')
    setActive(false)
  }

  if (!active || !box) return null

  const position = steps[step]?.position || 'bottom'
  const margin = 12

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    width: '260px',
    left: Math.min(box.left, window.innerWidth - 280),
    ...(position === 'bottom' && { top: box.bottom + margin }),
    ...(position === 'top' && { bottom: window.innerHeight - box.top + margin }),
  }

  return (
    <>
      <div className="fixed inset-0 z-[9998]" style={{background: 'rgba(0,0,0,0.5)'}} onClick={finish}/>

      {box && (
        <div className="fixed z-[9999] rounded-[16px] pointer-events-none"
          style={{
            top: box.top - 4,
            left: box.left - 4,
            width: box.width + 8,
            height: box.height + 8,
            boxShadow: '0 0 0 4px #5a4bc3, 0 0 0 9999px rgba(0,0,0,0.5)',
            borderRadius: '16px',
          }}
        />
      )}

      <div className="fixed z-[9999] bg-white rounded-[20px] p-4 shadow-xl" style={tooltipStyle}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[13px] font-bold text-[#5a4bc3]">{steps[step].title}</p>
          <p className="text-[11px] text-[#8c887d]">{step + 1}/{steps.length}</p>
        </div>
        <p className="text-[13px] text-[#47433d] mb-3">{steps[step].message}</p>
        <div className="flex gap-2">
          <button onClick={finish}
            className="flex-1 py-2 rounded-[12px] border border-[#e2decb] text-[12px] text-[#8c887d]">
            Saltar
          </button>
          <button onClick={next}
            className="flex-1 py-2 rounded-[12px] bg-[#5a4bc3] text-[12px] font-bold text-white">
            {step < steps.length - 1 ? 'Siguiente →' : '¡Entendido!'}
          </button>
        </div>
      </div>
    </>
  )
}