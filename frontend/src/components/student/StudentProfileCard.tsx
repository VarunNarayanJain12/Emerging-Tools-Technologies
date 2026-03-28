import { Student } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function StudentProfileCard({ student }: { student?: Student }) {
  if (!student) return null;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Student Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Row label="ID" value={student.student_id} />
        <Row label="Name" value={student.full_name} />
        <Row label="Email" value={student.guardian_email || 'N/A'} />
        <Row label="Enrolled" value={String(student.enrollment_year)} />
        <Row label="Department" value={student.department} />
      </CardContent>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}
