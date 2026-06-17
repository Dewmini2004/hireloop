import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import NewInterview from './pages/NewInterview'
import Interview from './pages/Interview'
import Results from './pages/Results'
import AdminDashboard from './pages/AdminDashboard'
import CompanyDashboard from './pages/CompanyDashboard'

function Loader() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
    </div>
  )
}

// Redirect after login based on role
function RoleRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  if (!user) return <Navigate to="/login" />
  if (user.role === 'admin') return <Navigate to="/admin" />
  if (user.role === 'hr') return <Navigate to="/company" />
  return <Navigate to="/dashboard" />
}

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  if (!user) return <Navigate to="/login" />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<RoleRedirect />} />

        {/* Candidate */}
        <Route path="/dashboard" element={<ProtectedRoute roles={['candidate']}><Dashboard /></ProtectedRoute>} />
        <Route path="/interview/new" element={<ProtectedRoute roles={['candidate']}><NewInterview /></ProtectedRoute>} />
        <Route path="/interview/:sessionId" element={<ProtectedRoute roles={['candidate']}><Interview /></ProtectedRoute>} />
        <Route path="/results/:sessionId" element={<ProtectedRoute roles={['candidate']}><Results /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />

        {/* Company / HR */}
        <Route path="/company" element={<ProtectedRoute roles={['hr','admin']}><CompanyDashboard /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  )
}
