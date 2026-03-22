import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StudentProfile {
  student_id: string
  name: string
  email: string
  enrollment_year: number
  program: string
}

const mock: StudentProfile = {
  student_id: 'STU-2021-0042',
  name: 'Arjun Mehta',
  email: 'arjun.mehta@university.edu',
  enrollment_year: 2021,
  program: 'B.Tech Computer Science',
}

export function StudentProfileCard() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Student Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Row label="ID" value={mock.student_id} />
        <Row label="Name" value={mock.name} />
        <Row label="Email" value={mock.email} />
        <Row label="Enrolled" value={String(mock.enrollment_year)} />
        <Row label="Program" value={mock.program} />
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
