import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AttendanceSummary {
  attendance_percentage: number
  total_classes: number
  attended_classes: number
  week_label: string
}

const mock: AttendanceSummary = {
  attendance_percentage: 68.5,
  total_classes: 120,
  attended_classes: 82,
  week_label: 'Week ending Mar 21, 2026',
}

function getColor(pct: number) {
  if (pct >= 75) return '#22c55e'
  if (pct >= 60) return '#eab308'
  return '#ef4444'
}

export function AttendanceSummaryCard({ data = mock }: { data?: AttendanceSummary }) {
  const color = getColor(data.attendance_percentage)
  const numRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const obj = { val: 0 }
    gsap.to(obj, {
      val: data.attendance_percentage,
      duration: 1.4,
      ease: 'power2.out',
      delay: 0.6,
      onUpdate: () => {
        if (numRef.current) numRef.current.textContent = obj.val.toFixed(1) + '%'
      },
    })
    gsap.fromTo(barRef.current,
      { width: '0%' },
      { width: `${data.attendance_percentage}%`, duration: 1.4, ease: 'power2.out', delay: 0.6 }
    )
  }, [data.attendance_percentage])

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Attendance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-1">
          <span ref={numRef} className="text-4xl font-bold" style={{ color }}>0%</span>
        </div>

        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
          <div ref={barRef} className="h-full rounded-full" style={{ backgroundColor: color, width: '0%' }} />
        </div>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{data.attended_classes} attended</span>
          <span>{data.total_classes} total</span>
        </div>

        <p className="text-xs text-muted-foreground">{data.week_label}</p>
      </CardContent>
    </Card>
  )
}
