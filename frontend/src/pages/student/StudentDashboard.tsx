import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { gsap } from 'gsap'
import { BellRing, LogOut, Loader2, AlertCircle } from 'lucide-react'
import { EduAlertLogo } from '@/components/auth/EduAlertLogo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { StudentProfileCard } from '@/components/student/StudentProfileCard'
import { RiskScoreDisplay } from '@/components/student/RiskScoreDisplay'
import { RiskStatusBadge } from '@/components/student/RiskStatusBadge'
import { AttendanceSummaryCard } from '@/components/student/AttendanceSummaryCard'
import { AssessmentScoresCard } from '@/components/student/AssessmentScoresCard'
import { NotificationItem } from '@/components/student/NotificationItem'
import { SessionCard } from '@/components/student/SessionCard'
import { studentService } from '@/services/studentService'
import { RiskProfileContext } from '@/types'

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const headerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const badgeRef = useRef<HTMLDivElement>(null)

  const [data, setData] = useState<RiskProfileContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      if (!user?.id) return;
      try {
        setLoading(true)
        setError(null)
        const studentId = await studentService.getStudentIdForUser(user.id)
        if (!studentId) {
          setError('No student record linked to your account. Please contact your mentor.')
          return
        }
        const profile = await studentService.getStudentRiskProfile(studentId)
        setData(profile)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user?.id])

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header slide down
      gsap.fromTo(headerRef.current,
        { opacity: 0, y: -30 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
      )
      // Cards stagger slide up
      if (gridRef.current && !loading && data) {
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
  }, [loading, data])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-xl max-w-md text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Failed to Load Dashboard</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-orange-500 text-white rounded-full font-semibold hover:bg-orange-600 transition-colors">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header ref={headerRef} className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <EduAlertLogo size="sm" />
          <div className="flex items-center gap-4">
            <div ref={badgeRef}>
              <RiskStatusBadge risk_category={data?.risk_profile?.risk_category || 'GREEN'} />
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
          <p className="text-gray-500 dark:text-gray-400 text-sm">Welcome back, {data?.student?.full_name} · {data?.student?.student_id}</p>
        </div>

        {/* Cards grid */}
        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <StudentProfileCard student={data?.student} />
          
          <RiskScoreDisplay 
            score={data?.risk_profile?.risk_score ?? 0}
            flags={{
              attendance_risk: !!data?.risk_profile?.attendance_risk,
              performance_risk: !!data?.risk_profile?.performance_risk,
              attempts_risk: !!data?.risk_profile?.attempt_risk,
              fee_risk: !!data?.risk_profile?.fee_risk
            }}
            updatedAt={data?.risk_profile?.updated_at}
          />

          <AttendanceSummaryCard data={{
            attendance_percentage: data?.attendance?.[0]?.attendance_percentage || 0,
            total_classes: data?.attendance?.[0]?.classes_conducted || 0,
            attended_classes: data?.attendance?.[0]?.classes_attended || 0,
            week_label: data?.attendance?.[0] ? `Last updated ${new Date(data.attendance[0].recorded_at).toLocaleDateString()}` : 'No attendance recorded'
          }} />

          <AssessmentScoresCard data={{
            overall_average: data?.assessments?.length 
              ? data.assessments.reduce((acc, curr) => acc + (curr.score_obtained / curr.max_score * 100), 0) / data.assessments.length
              : 0,
            recent: data?.assessments?.slice(0, 3).map(a => ({
              assessment_name: a.assessment_type,
              score: a.score_obtained,
              max_score: a.max_score,
              date: a.recorded_at
            })) || []
          }} />

          <div>
            <h2 className="text-xl font-bold mb-4">Counselling Sessions</h2>
            <div className="flex flex-col gap-4">
              {data?.sessions && data.sessions.length > 0 ? (
                data.sessions.map((s: any, i: number) => (
                  <SessionCard key={i} session={s} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-4">No recent counselling sessions.</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">Latest Notifications</h2>
            <div className="flex flex-col gap-3">
              {data?.notifications && data.notifications.length > 0 ? (
                data.notifications.map((n: any, j: number) => (
                  <NotificationItem key={j} notification={n} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-4">No recent notifications.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
