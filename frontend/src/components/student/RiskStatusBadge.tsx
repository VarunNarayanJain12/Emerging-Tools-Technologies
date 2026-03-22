import { Badge } from '@/components/ui/badge'

type RiskCategory = 'GREEN' | 'YELLOW' | 'RED'

interface RiskStatusBadgeProps {
  risk_category?: RiskCategory
}

const styles: Record<RiskCategory, string> = {
  GREEN: 'bg-green-100 text-green-700 border-green-300',
  YELLOW: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  RED: 'bg-red-100 text-red-700 border-red-300',
}

const labels: Record<RiskCategory, string> = {
  GREEN: '● Low Risk',
  YELLOW: '● Moderate Risk',
  RED: '● High Risk',
}

export function RiskStatusBadge({ risk_category = 'YELLOW' }: RiskStatusBadgeProps) {
  return (
    <Badge variant="outline" className={styles[risk_category]}>
      {labels[risk_category]}
    </Badge>
  )
}
