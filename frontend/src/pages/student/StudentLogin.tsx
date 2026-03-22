import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AuthFormCard } from '@/components/auth/AuthFormCard'
import { FormField } from '@/components/auth/FormField'
import { useAuth } from '@/context/useAuth'

const MOCK_STUDENT = {
  id: 'STU-2021-0042',
  email: 'arjun.mehta@university.edu',
  name: 'Arjun Mehta',
  role: 'student' as const,
}

export default function StudentLogin() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setUser({ ...MOCK_STUDENT, email: email || MOCK_STUDENT.email })
    navigate('/student/dashboard')
  }

  return (
    <AuthFormCard
      title="Student Login"
      description="Sign in to view your academic dashboard"
      onSubmit={handleSubmit}
      submitLabel="Sign In"
      footer={
        <>
          Don't have an account?{' '}
          <Link to="/student/register" className="text-orange-500 hover:text-orange-600 font-medium">Register</Link>
          {' · '}
          <Link to="/login" className="text-orange-500 hover:text-orange-600 font-medium">Back</Link>
        </>
      }
    >
      <FormField id="email" label="Email" type="email" placeholder="you@university.edu"
        value={email} onChange={e => setEmail(e.target.value)} required />
      <FormField id="password" label="Password" type="password" placeholder="••••••••"
        value={password} onChange={e => setPassword(e.target.value)} required />
    </AuthFormCard>
  )
}
