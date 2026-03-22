import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/useAuth'
import { UserRole } from '@/context/auth-context'
import { ReactNode } from 'react'

interface ProtectedRouteProps {
  role: UserRole
  children: ReactNode
}

export function ProtectedRoute({ role, children }: ProtectedRouteProps) {
  const { user } = useAuth()

  if (!user) return <Navigate to={`/${role}/login`} replace />
  if (user.role !== role) return <Navigate to={`/${user.role}/dashboard`} replace />

  return <>{children}</>
}
