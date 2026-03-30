import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AuthFormCard } from '@/components/auth/AuthFormCard'
import { FormField } from '@/components/auth/FormField'
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { studentService } from '@/services/studentService'

export default function StudentRegister() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      setIsLoading(true)
      setError(null)
      
      await studentService.registerStudent(email, password, fullName, studentId)
      
      setIsSuccess(true)
      setTimeout(() => navigate('/student/login'), 3000)
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please verify your Student ID.')
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <AuthFormCard
        title="Registration Successful!"
        description="Your account has been linked to your student record."
        onSubmit={() => {}}
        submitLabel=""
        footer={<Link to="/student/login" className="text-orange-500 font-bold underline">Go to Login</Link>}
      >
        <div className="py-12 flex flex-col items-center gap-4 text-center">
          <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">Redirecting to login in a few seconds...</p>
        </div>
      </AuthFormCard>
    )
  }

  return (
    <AuthFormCard
      title="Create Student Account"
      description="Register using your institutional Student ID"
      onSubmit={handleSubmit}
      submitLabel={isLoading ? "Registering..." : "Create Account"}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/student/login" className="text-orange-500 hover:text-orange-600 font-medium">Sign In</Link>
          {' · '}
          <Link to="/login" className="text-orange-500 hover:text-orange-600 font-medium">Back</Link>
        </>
      }
    >
      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <FormField id="studentId" label="Institutional Student ID" type="text" placeholder="e.g. STU001"
        value={studentId} onChange={e => setStudentId(e.target.value.toUpperCase())} required disabled={isLoading} />
      
      <FormField id="fullName" label="Full Name" type="text" placeholder="As per records"
        value={fullName} onChange={e => setFullName(e.target.value)} required disabled={isLoading} />

      <FormField id="email" label="Email" type="email" placeholder="you@university.edu"
        value={email} onChange={e => setEmail(e.target.value)} required disabled={isLoading} />
      
      <FormField id="password" label="Password" type="password" placeholder="••••••••"
        value={password} onChange={e => setPassword(e.target.value)} required disabled={isLoading} />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-[1px] z-10 rounded-3xl">
          <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
        </div>
      )}
    </AuthFormCard>
  )
}
