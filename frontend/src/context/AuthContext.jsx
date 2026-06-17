import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('hireloop_token')
    const saved = localStorage.getItem('hireloop_user')
    if (token && saved) setUser(JSON.parse(saved))
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password })
    localStorage.setItem('hireloop_token', res.data.token)
    localStorage.setItem('hireloop_user', JSON.stringify(res.data.user))
    setUser(res.data.user)
    return res.data
  }

  const register = async (name, email, password, invite_token) => {
    const res = await authAPI.register({ name, email, password, invite_token })
    localStorage.setItem('hireloop_token', res.data.token)
    localStorage.setItem('hireloop_user', JSON.stringify(res.data.user))
    setUser(res.data.user)
    return res.data
  }

  const logout = () => {
    localStorage.removeItem('hireloop_token')
    localStorage.removeItem('hireloop_user')
    setUser(null)
  }

  // Helper: where to redirect after login based on role
  const getHomeRoute = (role) => {
    if (role === 'admin') return '/admin'
    if (role === 'hr') return '/company'
    return '/dashboard'
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, getHomeRoute }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
