import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import LoginPageSimple from '@/pages/auth/LoginPageSimple'
import TestUsersPage from '@/pages/TestUsersPage'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { useAuthStore } from '@/stores/authStore'

export default function App() {
  const { user } = useAuthStore()

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={!user ? <LoginPageSimple /> : <Navigate to="/dashboard" />} />
          <Route path="/test-users" element={<TestUsersPage />} />
          
          {user ? (
            <Route path="/dashboard/*" element={<DashboardLayout />} />
          ) : (
            <Route path="*" element={<Navigate to="/" />} />
          )}
        </Routes>
      </Router>
      <Toaster position="top-right" />
    </>
  )
}
