import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { GraduationCap, BookOpen, ArrowRight, BellRing } from 'lucide-react'
import { ParticleBackground } from '@/components/auth/ParticleBackground'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface CardDef {
  icon: React.ReactNode
  title: string
  description: string
  route: string
  from: string
  to: string
}

const CARDS: CardDef[] = [
  {
    icon: <GraduationCap className="h-10 w-10 text-white" />,
    title: 'Student',
    description: 'View your risk score, attendance, and assessment performance.',
    route: '/student/login',
    from: 'from-orange-400',
    to: 'to-orange-600',
  },
  {
    icon: <BookOpen className="h-10 w-10 text-white" />,
    title: 'Teacher',
    description: 'Monitor at-risk students, flag concerns, and manage sessions.',
    route: '/teacher/login',
    from: 'from-orange-500',
    to: 'to-red-500',
  },
]

function RoleCard({ card, index, onSelect }: { card: CardDef; index: number; onSelect: (route: string) => void }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const iconRef = useRef<HTMLDivElement>(null)
  const arrowRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 70, scale: 0.93 },
      { opacity: 1, y: 0, scale: 1, duration: 0.75, ease: 'power3.out', delay: 0.3 + index * 0.15 }
    )
  }, [index])

  function onEnter() {
    gsap.to(cardRef.current, { y: -10, scale: 1.04, boxShadow: '0 30px 70px rgba(249,115,22,0.3)', duration: 0.3, ease: 'power2.out' })
    gsap.to(iconRef.current, { scale: 1.15, rotation: -8, duration: 0.3, ease: 'back.out(2)' })
    gsap.to(arrowRef.current, { opacity: 1, x: 0, duration: 0.25 })
  }

  function onLeave() {
    gsap.to(cardRef.current, { y: 0, scale: 1, boxShadow: '0 8px 30px rgba(0,0,0,0.1)', duration: 0.3, ease: 'power2.out' })
    gsap.to(iconRef.current, { scale: 1, rotation: 0, duration: 0.3, ease: 'power2.out' })
    gsap.to(arrowRef.current, { opacity: 0, x: -6, duration: 0.2 })
  }

  function onClick() {
    gsap.to(cardRef.current, {
      scale: 0.92, opacity: 0, duration: 0.35, ease: 'power2.in',
      onComplete: () => onSelect(card.route),
    })
  }

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="relative flex flex-col items-center gap-6 rounded-3xl cursor-pointer w-72 p-8
        bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl
        border border-orange-100 dark:border-orange-900/30
        shadow-xl"
      style={{ opacity: 0 }}
    >
      {/* Orange gradient icon bg */}
      <div
        ref={iconRef}
        className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${card.from} ${card.to} shadow-lg shadow-orange-300/40 dark:shadow-orange-900/40`}
      >
        {card.icon}
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{card.title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{card.description}</p>
      </div>

      <div className="flex items-center gap-1.5 text-sm font-semibold text-orange-500">
        Continue
        <span ref={arrowRef} style={{ opacity: 0, transform: 'translateX(-6px)' }}>
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>

      {/* Hover glow border */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-orange-400/0 hover:ring-orange-400/60 transition-all duration-300" />
    </div>
  )
}

export default function RoleSelection() {
  const navigate = useNavigate()
  const logoRef = useRef<HTMLDivElement>(null)
  const taglineRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    gsap.fromTo(logoRef.current,
      { opacity: 0, y: -30 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }
    )
    gsap.fromTo(taglineRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.6, ease: 'power2.out', delay: 0.2 }
    )
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-4">
      <ParticleBackground />

      {/* Radial orange glow behind cards */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[500px] w-[700px] rounded-full bg-orange-500/10 blur-[100px]" />
      </div>

      {/* Theme toggle */}
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-12">
        {/* Branding */}
        <div ref={logoRef} className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-300/40 dark:shadow-orange-900/50">
              <BellRing className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">EduAlert</h1>
              <p className="text-sm text-orange-500 font-medium">Manipal University Jaipur</p>
            </div>
          </div>
          <p ref={taglineRef} className="text-gray-500 dark:text-gray-400 text-base mt-1">
            Select your role to continue
          </p>
        </div>

        {/* Role cards */}
        <div className="flex flex-col sm:flex-row gap-6">
          {CARDS.map((card, i) => (
            <RoleCard key={card.title} card={card} index={i} onSelect={r => navigate(r)} />
          ))}
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-600">
          © {new Date().getFullYear()} EduAlert · Manipal University Jaipur
        </p>
      </div>
    </div>
  )
}
