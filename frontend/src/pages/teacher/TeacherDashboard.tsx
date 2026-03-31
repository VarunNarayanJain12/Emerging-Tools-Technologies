import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { LogOut, Users, Loader2, AlertCircle, Bot } from 'lucide-react'
import { EduAlertLogo } from '@/components/auth/EduAlertLogo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { riskService } from '@/services/riskService'
import { studentService } from '@/services/studentService'
import { RiskEvaluationSummary, StudentSummary } from '@/types'
import { AskAIModal } from '@/components/AskAIModal'

type RiskLevel = 'RED' | 'YELLOW' | 'GREEN'

const riskConfig: Record<RiskLevel, { label: string; badge: string; border: string; glow: string; dot: string }> = {
  RED:    { label: 'High Risk',     badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',       border: 'border-red-300 dark:border-red-700',    glow: 'hover:shadow-red-200 dark:hover:shadow-red-900/40',    dot: 'bg-red-500' },
  YELLOW: { label: 'Moderate Risk', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400', border: 'border-yellow-300 dark:border-yellow-700', glow: 'hover:shadow-yellow-200 dark:hover:shadow-yellow-900/40', dot: 'bg-yellow-500' },
  GREEN:  { label: 'Low Risk',      badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',  border: 'border-green-300 dark:border-green-700',  glow: 'hover:shadow-green-200 dark:hover:shadow-green-900/40',  dot: 'bg-green-500' },
}

function StudentCard({ 
  student, 
  index, 
  onAskAI 
}: { 
  student: StudentSummary; 
  index: number;
  onAskAI: (id: string, name: string) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const badgeRef = useRef<HTMLSpanElement>(null)
  const risk = (student.risk_category || 'GREEN') as RiskLevel
  const cfg = riskConfig[risk]

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
      className={`rounded-2xl border-2 ${cfg.border} bg-white dark:bg-gray-900 p-5 shadow-md hover:shadow-xl ${cfg.glow} transition-shadow duration-300 flex flex-col`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{student.student_name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{student.student_id}</p>
        </div>
        <span ref={badgeRef} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 h-10 line-clamp-2">{student.flags_triggered.join(', ') || 'No active flags'}</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Risk Score</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{student.risk_score ?? 'N/A'}</p>
        </div>
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Attendance</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{student.avg_attendance?.toFixed(1) || '0.0'}%</p>
        </div>
      </div>

      <button 
        onClick={(e) => {
          e.stopPropagation();
          onAskAI(student.student_id, student.student_name);
        }}
        className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 rounded-xl text-sm font-bold border border-orange-100 dark:border-orange-900/30 hover:bg-orange-500 hover:text-white dark:hover:bg-orange-500 dark:hover:text-white transition-all duration-300"
      >
        <Bot className="h-4 w-4" />
        Ask AI
      </button>
    </div>
  )
}

export default function TeacherDashboard() {
  const { user, userProfile, logout } = useAuth()
  const navigate = useNavigate()
  const headerRef = useRef<HTMLDivElement>(null)

  const [summary, setSummary] = useState<RiskEvaluationSummary | null>(null)
  const [students, setStudents] = useState<StudentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // AI Modal state
  const [openAIStudent, setOpenAIStudent] = useState<{id: string, name: string} | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        // 1. Get pre-computed evaluation summary (ReadOnly & Fast)
        const evalSum = await riskService.getRiskSummary()
        setSummary(evalSum)

        // 2. Fetch all active students
        const studentList = await studentService.getAllStudents()

        // 3. Fetch details for those students
        const studentDetails = await Promise.all(
          studentList.map(s => studentService.getStudentSummary(s.student_id))
        )
        setStudents(studentDetails)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    gsap.fromTo(headerRef.current,
      { opacity: 0, y: -30 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
    )
  }, [])


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading Teacher Dashboard...</p>
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
          <p className="text-gray-500 dark:text-gray-400 text-sm">Welcome back, {userProfile?.full_name || user?.email}</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 max-w-lg">
          {[
            { label: 'High Risk', count: summary?.red || 0, color: 'text-red-500' },
            { label: 'Moderate', count: summary?.yellow || 0, color: 'text-yellow-500' },
            { label: 'Low Risk', count: summary?.green || 0, color: 'text-green-500' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 text-center shadow-sm">
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Student cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {students.map((s, i) => (
            <StudentCard 
              key={s.student_id} 
              student={s} 
              index={i} 
              onAskAI={(id, name) => setOpenAIStudent({id, name})}
            />
          ))}
        </div>
      </main>

      {/* AI Modal */}
      <AskAIModal 
        isOpen={!!openAIStudent}
        onClose={() => setOpenAIStudent(null)}
        studentId={openAIStudent?.id || ''}
        studentName={openAIStudent?.name || ''}
      />
    </div>
  )
}
