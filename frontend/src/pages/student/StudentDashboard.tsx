import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/useAuth'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { BellRing, LogOut } from 'lucide-react'
import { EduAlertLogo } from '@/components/auth/EduAlertLogo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { StudentProfileCard } from '@/components/student/StudentProfileCard'
import { RiskScoreDisplay } from '@/components/student/RiskScoreDisplay'
import { RiskStatusBadge } from '@/components/student/RiskStatusBadge'
import { AttendanceSummaryCard } from '@/components/student/AttendanceSummaryCard'
import { AssessmentScoresCard } from '@/components/student/AssessmentScoresCard'
import { NotificationItem } from '@/components/student/NotificationItem'
import { SessionCard } from '@/components/student/SessionCard'

export default function StudentDashboard() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const headerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const badgeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header slide down
      gsap.fromTo(headerRef.current,
        { opacity: 0, y: -30 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
      )
      // Cards stagger slide up
      if (gridRef.current) {
        gsap.fromTo(Array.from(gridRef.current.children),
          { opacity: 0, y: 50 },
          { opacity: 1, y: 0, duration: 0.55, stagger: 0.1, ease: 'power3.out', delay: 0.3 }
        )
      }
      // Risk badge pulse
      gsap.to(badgeRef.current, {
        scale: 1.08, duration: 0.9, repeat: -1, yoyo: true, ease: 'sine.inOut'
      })
    })
    return () => ctx.revert()
  }, [])

  function logout() {
    setUser(null)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header ref={headerRef} className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <EduAlertLogo size="sm" />
          <div className="flex items-center gap-4">
            <div ref={badgeRef}>
              <RiskStatusBadge risk_category="YELLOW" />
            </div>
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
            <BellRing className="h-6 w-6 text-orange-500" />
            Student Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Welcome back, {user?.name} · {user?.id}</p>
        </div>

        {/* Cards grid */}
        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <StudentProfileCard />
          <RiskScoreDisplay />
          <AttendanceSummaryCard />
          <AssessmentScoresCard />
          <SessionCard />
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Notifications</p>
            <NotificationItem />
          </div>
        </div>
      </main>
    </div>
  )
}
