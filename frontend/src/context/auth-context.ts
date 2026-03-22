import { createContext } from 'react'

export interface AuthContextType {
  user: null | { id: string; email: string }
  setUser: (user: null | { id: string; email: string }) => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
