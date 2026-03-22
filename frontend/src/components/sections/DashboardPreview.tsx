import { BellRing, LogOut, Users, GraduationCap, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react"

// ── Mini Student Dashboard Preview ──────────────────────────────────────────
function StudentPreview() {
  return (
    <div className="h-full w-full bg-gray-50 dark:bg-gray-950 overflow-auto rounded-xl text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <BellRing className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-sm">EduAlert</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-semibold">● Moderate Risk</span>
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <LogOut className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div>
          <p className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-1">
            <GraduationCap className="w-4 h-4 text-orange-500" /> Student Dashboard
          </p>
          <p className="text-gray-400 text-[10px]">Welcome back, Arjun Mehta · STU-2021-0042</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Risk Score */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-2.5 border border-gray-100 dark:border-gray-800 shadow-sm">
            <p className="text-[10px] text-gray-400 mb-1">Risk Score</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">67</p>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div className="h-full rounded-full bg-yellow-400" style={{ width: '67%' }} />
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {['Attendance ⚠', 'Attempts ⚠', 'Performance ✓', 'Fee ✓'].map(f => (
                <span key={f} className={`text-[9px] px-1 py-0.5 rounded ${f.includes('⚠') ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-400'}`}>{f}</span>
              ))}
            </div>
          </div>

          {/* Attendance */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-2.5 border border-gray-100 dark:border-gray-800 shadow-sm">
            <p className="text-[10px] text-gray-400 mb-1">Attendance</p>
            <p className="text-2xl font-bold text-yellow-500">68.5%</p>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div className="h-full rounded-full bg-yellow-400" style={{ width: '68.5%' }} />
            </div>
            <div className="flex justify-between mt-1.5 text-[9px] text-gray-400">
              <span>82 attended</span><span>120 total</span>
            </div>
          </div>

          {/* Assessments */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-2.5 border border-gray-100 dark:border-gray-800 shadow-sm">
            <p className="text-[10px] text-gray-400 mb-1">Avg Score</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">61.4</p>
            <div className="space-y-1 mt-1.5">
              {[['Mid-Sem', 58], ['Lab 3', 72], ['Quiz 2', 54]].map(([n, s]) => (
                <div key={n} className="flex justify-between text-[9px]">
                  <span className="text-gray-400">{n}</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{s}/100</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Notification */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-2.5 border border-blue-100 dark:border-blue-800 flex gap-2">
          <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
          <p className="text-[10px] text-gray-600 dark:text-gray-300">Your attendance has dropped below 75%. Please contact your advisor.</p>
        </div>
      </div>
    </div>
  )
}

// ── Mini Teacher Dashboard Preview ──────────────────────────────────────────
const STUDENTS = [
  { name: 'Arjun Mehta', id: 'STU-2021-0042', program: 'B.Tech CS', risk: 'RED' as const, score: 78, att: 61 },
  { name: 'Sneha Iyer', id: 'STU-2022-0017', program: 'B.Tech ECE', risk: 'YELLOW' as const, score: 52, att: 72 },
  { name: 'Rohan Das', id: 'STU-2021-0089', program: 'B.Tech ME', risk: 'GREEN' as const, score: 28, att: 88 },
  { name: 'Priya Nair', id: 'STU-2023-0011', program: 'B.Tech IT', risk: 'RED' as const, score: 81, att: 55 },
  { name: 'Karan Verma', id: 'STU-2022-0034', program: 'B.Tech CS', risk: 'YELLOW' as const, score: 47, att: 69 },
  { name: 'Ananya Singh', id: 'STU-2021-0067', program: 'B.Tech ECE', risk: 'GREEN' as const, score: 19, att: 91 },
]

const riskStyle = {
  RED:    { badge: 'bg-red-100 text-red-600', border: 'border-red-200 dark:border-red-800', label: 'High Risk', dot: 'bg-red-500' },
  YELLOW: { badge: 'bg-yellow-100 text-yellow-600', border: 'border-yellow-200 dark:border-yellow-800', label: 'Moderate', dot: 'bg-yellow-500' },
  GREEN:  { badge: 'bg-green-100 text-green-600', border: 'border-green-200 dark:border-green-800', label: 'Low Risk', dot: 'bg-green-500' },
}

function TeacherPreview() {
  return (
    <div className="h-full w-full bg-gray-50 dark:bg-gray-950 overflow-auto rounded-xl text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <BellRing className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-sm">EduAlert</span>
        </div>
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
          <LogOut className="w-2.5 h-2.5 text-white" />
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div>
          <p className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-1">
            <Users className="w-4 h-4 text-orange-500" /> Teacher Dashboard
          </p>
          <p className="text-gray-400 text-[10px]">Welcome back, Dr. Priya Sharma</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'High Risk', count: 2, icon: <AlertTriangle className="w-3 h-3" />, color: 'text-red-500' },
            { label: 'Moderate', count: 2, icon: <TrendingUp className="w-3 h-3" />, color: 'text-yellow-500' },
            { label: 'Low Risk', count: 2, icon: <CheckCircle className="w-3 h-3" />, color: 'text-green-500' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-900 rounded-xl p-2 border border-gray-100 dark:border-gray-800 text-center shadow-sm">
              <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
              <p className="text-[9px] text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Student cards */}
        <div className="grid grid-cols-2 gap-2">
          {STUDENTS.map(s => {
            const cfg = riskStyle[s.risk]
            return (
              <div key={s.id} className={`bg-white dark:bg-gray-900 rounded-xl p-2.5 border-2 ${cfg.border} shadow-sm`}>
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-[11px]">{s.name}</p>
                    <p className="text-[9px] text-gray-400">{s.id}</p>
                  </div>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1 ${cfg.badge}`}>
                    <span className={`h-1 w-1 rounded-full ${cfg.dot}`} />{cfg.label}
                  </span>
                </div>
                <p className="text-[9px] text-gray-500 mb-1.5">{s.program}</p>
                <div className="grid grid-cols-2 gap-1">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-1 text-center">
                    <p className="text-[9px] text-gray-400">Risk</p>
                    <p className="font-bold text-gray-900 dark:text-white text-[11px]">{s.score}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-1 text-center">
                    <p className="text-[9px] text-gray-400">Att.</p>
                    <p className="font-bold text-gray-900 dark:text-white text-[11px]">{s.att}%</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Exported component ───────────────────────────────────────────────────────
export function DashboardPreview({ tab }: { tab: 'teacher' | 'counsellor' }) {
  return tab === 'teacher' ? <TeacherPreview /> : <StudentPreview />
}
