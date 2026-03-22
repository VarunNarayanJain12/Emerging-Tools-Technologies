import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface RiskFlags {
  attendance_risk: boolean
  performance_risk: boolean
  attempts_risk: boolean
  fee_risk: boolean
}

interface RiskScoreDisplayProps {
  score?: number
  flags?: RiskFlags
  updatedAt?: string
}

const mockFlags: RiskFlags = {
  attendance_risk: true,
  performance_risk: false,
  attempts_risk: true,
  fee_risk: false,
}

function getRiskMeta(score: number) {
  if (score >= 70) return { level: 'High', color: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-400 dark:border-red-700', bar: '#ef4444' }
  if (score >= 40) return { level: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-400 dark:border-yellow-700', bar: '#eab308' }
  return { level: 'Low', color: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-400 dark:border-green-700', bar: '#22c55e' }
}

const FLAG_LABELS: Record<keyof RiskFlags, string> = {
  attendance_risk: 'Attendance',
  performance_risk: 'Performance',
  attempts_risk: 'Attempts',
  fee_risk: 'Fee',
}

export function RiskScoreDisplay({
  score = 67,
  flags = mockFlags,
  updatedAt = '2026-03-18T08:00:00Z',
}: RiskScoreDisplayProps) {
  const { level, color, bar } = getRiskMeta(score)
  const numRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Count up animation
    const obj = { val: 0 }
    gsap.to(obj, {
      val: score,
      duration: 1.4,
      ease: 'power2.out',
      delay: 0.5,
      onUpdate: () => {
        if (numRef.current) numRef.current.textContent = Math.round(obj.val).toString()
      },
    })
    // Bar fill
    gsap.fromTo(barRef.current,
      { width: '0%' },
      { width: `${score}%`, duration: 1.4, ease: 'power2.out', delay: 0.5 }
    )
  }, [score])

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Risk Score</CardTitle>
        <Badge variant="outline" className={color}>{level} Risk</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <span ref={numRef} className="text-4xl font-bold">0</span>
          <span className="text-muted-foreground text-sm mb-1">/ 100</span>
        </div>

        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
          <div ref={barRef} className="h-full rounded-full" style={{ backgroundColor: bar, width: '0%' }} />
        </div>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(flags) as (keyof RiskFlags)[]).map((key) => (
            <Badge key={key} variant="outline"
              className={flags[key]
                ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                : 'bg-muted text-muted-foreground'}>
              {FLAG_LABELS[key]}{flags[key] ? ' ⚠' : ' ✓'}
            </Badge>
          ))}
        </div>

        {updatedAt && (
          <p className="text-xs text-muted-foreground">
            Updated {new Date(updatedAt).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
