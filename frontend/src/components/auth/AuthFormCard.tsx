import { ReactNode, FormEvent, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { EduAlertLogo } from './EduAlertLogo'
import { ParticleBackground } from './ParticleBackground'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface AuthFormCardProps {
  title: string
  description?: string
  onSubmit: (e: FormEvent) => void
  submitLabel: string
  footer?: ReactNode
  children: ReactNode
}

export function AuthFormCard({ title, description, onSubmit, submitLabel, footer, children }: AuthFormCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const fieldsRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Card entrance
      gsap.fromTo(cardRef.current,
        { opacity: 0, y: 40, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out' }
      )
      // Staggered fields
      if (fieldsRef.current) {
        gsap.fromTo(fieldsRef.current.children,
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'power2.out', delay: 0.3 }
        )
      }
    })
    return () => ctx.revert()
  }, [])

  function handleBtnEnter() {
    gsap.to(btnRef.current, { scale: 1.04, boxShadow: '0 0 20px rgba(249,115,22,0.5)', duration: 0.2 })
  }
  function handleBtnLeave() {
    gsap.to(btnRef.current, { scale: 1, boxShadow: '0 0 0px rgba(249,115,22,0)', duration: 0.2 })
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 overflow-hidden">
      <ParticleBackground />

      {/* Theme toggle top-right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div ref={cardRef} className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <EduAlertLogo size="lg" />
        </div>

        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-orange-100 dark:border-orange-900/30 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
            {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
          </div>

          <form onSubmit={onSubmit}>
            <div ref={fieldsRef} className="space-y-4">
              {children}
            </div>

            <button
              ref={btnRef}
              type="submit"
              onMouseEnter={handleBtnEnter}
              onMouseLeave={handleBtnLeave}
              className="mt-6 w-full py-3 px-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-orange-200 dark:hover:shadow-orange-900/40 transition-shadow duration-300"
            >
              {submitLabel}
            </button>
          </form>

          {footer && (
            <div className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
