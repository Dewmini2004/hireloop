import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Zap } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const data = await login(form.email, form.password)
      // Role-based redirect
      if (data.user.role === 'admin') navigate('/admin')
      else if (data.user.role === 'hr') navigate('/company')
      else navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center"><Zap size={16} /></div>
            <span className="font-bold text-lg">HireLoop</span>
          </div>
        </div>
        <div className="card">
          <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
          <p className="text-gray-400 text-sm mb-6">Sign in to continue</p>
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}

          {/* Quick login hint for demo */}
          <div className="bg-gray-800/50 rounded-xl px-4 py-3 mb-4 text-xs text-gray-400">
            <p className="font-medium text-gray-300 mb-1">Demo accounts:</p>
            <p>Admin: <span className="text-brand-500">admin@hireloop.com</span> / <span className="text-brand-500">admin123</span></p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <p className="text-center text-gray-500 text-sm mt-6">
            No account? <Link to="/register" className="text-brand-500 hover:underline">Register free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
