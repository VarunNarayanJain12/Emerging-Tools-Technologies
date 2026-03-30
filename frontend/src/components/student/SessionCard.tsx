import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Session {
  initiated_by_user_id: string
  session_date: string
  session_duration_minutes: number
  topics_discussed: string
  session_type: 'individual' | 'group' | 'virtual'
}

export function SessionCard({ session }: { session: Session }) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Counselling Session</CardTitle>
        <Badge variant="outline" className="capitalize">{session.session_type}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Date</span>
          <span className="font-medium">{new Date(session.session_date).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Duration</span>
          <span className="font-medium">{session.session_duration_minutes} min</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Counsellor ID</span>
          <span className="font-medium">{session.initiated_by_user_id}</span>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground">Topics Discussed</p>
          <p className="text-xs leading-relaxed">{session.topics_discussed}</p>
        </div>
      </CardContent>
    </Card>
  )
}
