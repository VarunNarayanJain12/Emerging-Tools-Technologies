import { createContext } from 'react'

export type UserRole = 'student' | 'teacher'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
}

export interface AuthContextType {
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
