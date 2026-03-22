import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AuthFormCard } from '@/components/auth/AuthFormCard'
import { FormField } from '@/components/auth/FormField'
import { useAuth } from '@/context/useAuth'

export default function TeacherRegister() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '', department: '',
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setUser({ id: 'TCHR-NEW-001', email: form.email, name: form.name, role: 'teacher' })
    navigate('/teacher/dashboard')
  }

  return (
    <AuthFormCard
      title="Teacher Registration"
      description="Create your teacher account"
      onSubmit={handleSubmit}
      submitLabel="Create Account"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/teacher/login" className="text-orange-500 hover:text-orange-600 font-medium">Sign in</Link>
          {' · '}
          <Link to="/login" className="text-orange-500 hover:text-orange-600 font-medium">Back</Link>
        </>
      }
    >
      <FormField id="name" label="Full Name" placeholder="Dr. Priya Sharma"
        value={form.name} onChange={set('name')} required />
      <FormField id="email" label="Email" type="email" placeholder="you@university.edu"
        value={form.email} onChange={set('email')} required />
      <FormField id="password" label="Password" type="password" placeholder="••••••••"
        value={form.password} onChange={set('password')} required />
      <FormField id="confirm" label="Confirm Password" type="password" placeholder="••••••••"
        value={form.confirm} onChange={set('confirm')} required />
      <FormField id="department" label="Department" placeholder="Computer Science"
        value={form.department} onChange={set('department')} required />
    </AuthFormCard>
  )
}
