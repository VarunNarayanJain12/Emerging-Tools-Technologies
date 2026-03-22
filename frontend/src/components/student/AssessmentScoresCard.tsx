import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AssessmentScore {
  assessment_name: string
  score: number
  max_score: number
  date: string
}

interface AssessmentScoresData {
  overall_average: number
  recent: AssessmentScore[]
}

const mock: AssessmentScoresData = {
  overall_average: 61.4,
  recent: [
    { assessment_name: 'Mid-Sem Exam', score: 58, max_score: 100, date: '2026-03-10' },
    { assessment_name: 'Lab Assignment 3', score: 72, max_score: 100, date: '2026-02-28' },
    { assessment_name: 'Quiz 2', score: 54, max_score: 100, date: '2026-02-14' },
  ],
}

export function AssessmentScoresCard({ data = mock }: { data?: AssessmentScoresData }) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Assessment Scores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-1">
          <span className="text-4xl font-bold">{data.overall_average.toFixed(1)}</span>
          <span className="text-muted-foreground text-sm mb-1">avg</span>
        </div>

        <div className="space-y-2">
          {data.recent.map((a) => (
            <div key={a.assessment_name} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{a.assessment_name}</p>
                <p className="text-xs text-muted-foreground">{new Date(a.date).toLocaleDateString()}</p>
              </div>
              <span className="font-semibold tabular-nums">
                {a.score}/{a.max_score}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
