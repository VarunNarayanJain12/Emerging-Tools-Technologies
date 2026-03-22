import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/sections/Hero'
import { About } from '@/components/sections/About'
import { Features } from '@/components/sections/Features'
import { Workflow } from '@/components/sections/WorkFlow'
import RoleSelection from '@/pages/RoleSelection'
import StudentLogin from '@/pages/student/StudentLogin'
import StudentRegister from '@/pages/student/StudentRegister'
import StudentDashboard from '@/pages/student/StudentDashboard'
import TeacherLogin from '@/pages/teacher/TeacherLogin'
import TeacherRegister from '@/pages/teacher/TeacherRegister'
import TeacherDashboard from '@/pages/teacher/TeacherDashboard'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

function LandingPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <About />
        <Features />
        <Workflow />
      </main>
      <Footer />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<RoleSelection />} />
        <Route path="/signup" element={<RoleSelection />} />

        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/register" element={<StudentRegister />} />
        <Route path="/student/dashboard" element={
          <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>
        } />

        <Route path="/teacher/login" element={<TeacherLogin />} />
        <Route path="/teacher/register" element={<TeacherRegister />} />
        <Route path="/teacher/dashboard" element={
          <ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
