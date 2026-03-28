import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AuthFormCard } from '@/components/auth/AuthFormCard'
import { FormField } from '@/components/auth/FormField'
import { useAuth } from '@/context/AuthContext'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function TeacherLogin() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      setIsLoading(true)
      setError(null)
      await login(email, password)
      navigate('/teacher/dashboard')
    } catch (err: any) {
      setError(err.message || 'Invalid email or password')
      setIsLoading(false)
    }
  }

  return (
    <AuthFormCard
      title="Teacher Login"
      description="Sign in to manage your students"
      onSubmit={handleSubmit}
      submitLabel={isLoading ? "Signing in..." : "Sign In"}
      footer={
        <>
          Don't have an account?{' '}
          <Link to="/teacher/register" className="text-orange-500 hover:text-orange-600 font-medium">Register</Link>
          {' · '}
          <Link to="/login" className="text-orange-500 hover:text-orange-600 font-medium">Back</Link>
        </>
      }
    >
      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <FormField id="email" label="Email" type="email" placeholder="you@university.edu"
        value={email} onChange={e => setEmail(e.target.value)} required disabled={isLoading} />
      <div className="relative">
        <FormField id="password" label="Password" type="password" placeholder="••••••••"
          value={password} onChange={e => setPassword(e.target.value)} required disabled={isLoading} />
      </div>
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-[1px] z-10 rounded-3xl">
          <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
        </div>
      )}
    </AuthFormCard>
  )
}
