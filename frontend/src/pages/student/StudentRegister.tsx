import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AuthFormCard } from '@/components/auth/AuthFormCard'
import { FormField } from '@/components/auth/FormField'
import { useAuth } from '@/context/useAuth'

export default function StudentRegister() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '', enrollment_year: '', program: '',
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setUser({ id: 'STU-NEW-001', email: form.email, name: form.name, role: 'student' })
    navigate('/student/dashboard')
  }

  return (
    <AuthFormCard
      title="Student Registration"
      description="Create your student account"
      onSubmit={handleSubmit}
      submitLabel="Create Account"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/student/login" className="text-orange-500 hover:text-orange-600 font-medium">Sign in</Link>
          {' · '}
          <Link to="/login" className="text-orange-500 hover:text-orange-600 font-medium">Back</Link>
        </>
      }
    >
      <FormField id="name" label="Full Name" placeholder="Arjun Mehta"
        value={form.name} onChange={set('name')} required />
      <FormField id="email" label="Email" type="email" placeholder="you@university.edu"
        value={form.email} onChange={set('email')} required />
      <FormField id="password" label="Password" type="password" placeholder="••••••••"
        value={form.password} onChange={set('password')} required />
      <FormField id="confirm" label="Confirm Password" type="password" placeholder="••••••••"
        value={form.confirm} onChange={set('confirm')} required />
      <FormField id="enrollment_year" label="Enrollment Year" type="number" placeholder="2022"
        value={form.enrollment_year} onChange={set('enrollment_year')} required />
      <FormField id="program" label="Program" placeholder="B.Tech Computer Science"
        value={form.program} onChange={set('program')} required />
    </AuthFormCard>
  )
}
