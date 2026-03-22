import { Badge } from '@/components/ui/badge'

interface Notification {
  message: string
  channel: 'in-app' | 'email' | 'sms'
  created_at: string
  is_read: boolean
}

const mock: Notification = {
  message: 'Your attendance has dropped below 75%. Please contact your advisor.',
  channel: 'in-app',
  created_at: '2026-03-20T09:30:00Z',
  is_read: false,
}

export function NotificationItem({ notification = mock }: { notification?: Notification }) {
  return (
    <div className={`flex gap-3 rounded-lg border p-3 text-sm transition-colors ${
      notification.is_read ? 'bg-background' : 'bg-muted/40'
    }`}>
      {/* Unread dot */}
      <div className="mt-1 shrink-0">
        <span className={`block h-2 w-2 rounded-full ${notification.is_read ? 'bg-transparent' : 'bg-blue-500'}`} />
      </div>

      <div className="flex-1 space-y-1">
        <p className={notification.is_read ? 'text-muted-foreground' : 'font-medium'}>
          {notification.message}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs py-0">{notification.channel}</Badge>
          <span>{new Date(notification.created_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
