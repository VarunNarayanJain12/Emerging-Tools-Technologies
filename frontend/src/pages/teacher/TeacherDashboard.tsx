import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/useAuth'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { LogOut, Users } from 'lucide-react'
import { EduAlertLogo } from '@/components/auth/EduAlertLogo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

type RiskLevel = 'RED' | 'YELLOW' | 'GREEN'

const MOCK_STUDENTS = [
  { id: 'STU-2021-0042', name: 'Arjun Mehta', program: 'B.Tech CS', risk: 'RED' as RiskLevel, score: 78, attendance: 61 },
  { id: 'STU-2022-0017', name: 'Sneha Iyer', program: 'B.Tech ECE', risk: 'YELLOW' as RiskLevel, score: 52, attendance: 72 },
  { id: 'STU-2021-0089', name: 'Rohan Das', program: 'B.Tech ME', risk: 'GREEN' as RiskLevel, score: 28, attendance: 88 },
  { id: 'STU-2023-0011', name: 'Priya Nair', program: 'B.Tech IT', risk: 'RED' as RiskLevel, score: 81, attendance: 55 },
  { id: 'STU-2022-0034', name: 'Karan Verma', program: 'B.Tech CS', risk: 'YELLOW' as RiskLevel, score: 47, attendance: 69 },
  { id: 'STU-2021-0067', name: 'Ananya Singh', program: 'B.Tech ECE', risk: 'GREEN' as RiskLevel, score: 19, attendance: 91 },
]

const riskConfig: Record<RiskLevel, { label: string; badge: string; border: string; glow: string; dot: string }> = {
  RED:    { label: 'High Risk',     badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',       border: 'border-red-300 dark:border-red-700',    glow: 'hover:shadow-red-200 dark:hover:shadow-red-900/40',    dot: 'bg-red-500' },
  YELLOW: { label: 'Moderate Risk', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400', border: 'border-yellow-300 dark:border-yellow-700', glow: 'hover:shadow-yellow-200 dark:hover:shadow-yellow-900/40', dot: 'bg-yellow-500' },
  GREEN:  { label: 'Low Risk',      badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',  border: 'border-green-300 dark:border-green-700',  glow: 'hover:shadow-green-200 dark:hover:shadow-green-900/40',  dot: 'bg-green-500' },
}

function StudentCard({ student, index }: { student: typeof MOCK_STUDENTS[0]; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const badgeRef = useRef<HTMLSpanElement>(null)
  const cfg = riskConfig[student.risk]

  useEffect(() => {
    gsap.fromTo(cardRef.current,
      { opacity: 0, x: -40 },
      { opacity: 1, x: 0, duration: 0.55, ease: 'power3.out', delay: 0.2 + index * 0.1 }
    )
    gsap.fromTo(badgeRef.current,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.7)', delay: 0.5 + index * 0.1 }
    )
  }, [index])

  function onEnter() {
    gsap.to(cardRef.current, { scale: 1.03, y: -4, duration: 0.25, ease: 'power2.out' })
  }
  function onLeave() {
    gsap.to(cardRef.current, { scale: 1, y: 0, duration: 0.25, ease: 'power2.out' })
  }

  return (
    <div
      ref={cardRef}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`rounded-2xl border-2 ${cfg.border} bg-white dark:bg-gray-900 p-5 shadow-md hover:shadow-xl ${cfg.glow} transition-shadow duration-300 cursor-pointer`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{student.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{student.id}</p>
        </div>
        <span ref={badgeRef} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{student.program}</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Risk Score</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{student.score}</p>
        </div>
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Attendance</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{student.attendance}%</p>
        </div>
      </div>
    </div>
  )
}

export default function TeacherDashboard() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.fromTo(headerRef.current,
      { opacity: 0, y: -30 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
    )
  }, [])

  function logout() {
    setUser(null)
    navigate('/')
  }

  const high = MOCK_STUDENTS.filter(s => s.risk === 'RED').length
  const moderate = MOCK_STUDENTS.filter(s => s.risk === 'YELLOW').length
  const low = MOCK_STUDENTS.filter(s => s.risk === 'GREEN').length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header ref={headerRef} className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <EduAlertLogo size="sm" />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold rounded-full hover:shadow-lg hover:shadow-orange-200 dark:hover:shadow-orange-900/40 hover:scale-105 transition-all duration-300"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Welcome */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-orange-500" />
            Teacher Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Welcome back, {user?.name}</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 max-w-lg">
          {[
            { label: 'High Risk', count: high, color: 'text-red-500' },
            { label: 'Moderate', count: moderate, color: 'text-yellow-500' },
            { label: 'Low Risk', count: low, color: 'text-green-500' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 text-center shadow-sm">
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Student cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {MOCK_STUDENTS.map((s, i) => (
            <StudentCard key={s.id} student={s} index={i} />
          ))}
        </div>
      </main>
    </div>
  )
}
