import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { progressAPI } from '../services/api'
import { Zap, Plus, TrendingUp, Award, Flame, BarChart2, LogOut } from 'lucide-react'

const BADGES = {
  first_interview: { label: 'First Interview', emoji: '🎯' },
  high_scorer: { label: 'High Scorer', emoji: '⭐' },
  week_streak: { label: '7-Day Streak', emoji: '🔥' },
  dedicated: { label: 'Dedicated', emoji: '💪' },
}

const scoreColor = (s) => s >= 80 ? 'text-green-400' : s >= 60 ? 'text-yellow-400' : 'text-red-400'
const recColor = (r) => ({ strong_yes: 'bg-green-500/10 text-green-400', yes: 'bg-blue-500/10 text-blue-400', maybe: 'bg-yellow-500/10 text-yellow-400', no: 'bg-red-500/10 text-red-400' })[r] || ''
const recLabel = (r) => ({ strong_yes: 'Strong hire', yes: 'Hire', maybe: 'Maybe', no: 'Not ready' })[r] || r

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    progressAPI.dashboard(user.id).then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [user.id])

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-900">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center"><Zap size={16} /></div>
          <span className="font-bold text-lg">HireLoop</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">Hi, {user.name}</span>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-400 mt-1">Track your interview performance over time</p>
          </div>
          <Link to="/interview/new" className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New interview
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div></div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { icon: BarChart2, label: 'Total interviews', value: data?.total_sessions || 0 },
                { icon: TrendingUp, label: 'Average score', value: `${data?.average_score || 0}%` },
                { icon: Flame, label: 'Current streak', value: `${data?.streak?.current_streak || 0} days` },
                { icon: Award, label: 'Badges earned', value: data?.streak?.badges?.length || 0 },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="card">
                  <Icon size={18} className="text-brand-500 mb-3" />
                  <div className="text-2xl font-bold mb-1">{value}</div>
                  <div className="text-gray-500 text-xs">{label}</div>
                </div>
              ))}
            </div>

            {/* Badges */}
            {data?.streak?.badges?.length > 0 && (
              <div className="card mb-8">
                <h2 className="font-semibold mb-4">Badges</h2>
                <div className="flex flex-wrap gap-3">
                  {data.streak.badges.map(b => (
                    <div key={b} className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2 text-sm">
                      <span>{BADGES[b]?.emoji}</span>
                      <span className="text-gray-300">{BADGES[b]?.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sessions */}
            <div className="card">
              <h2 className="font-semibold mb-4">Recent sessions</h2>
              {!data?.sessions?.length ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No interviews yet. Start your first one!</p>
                  <Link to="/interview/new" className="btn-primary inline-flex items-center gap-2"><Plus size={16} />Start interview</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.sessions.map(s => (
                    <Link key={s.id} to={`/results/${s.session_id}`} className="flex items-center justify-between p-4 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors">
                      <div>
                        <div className="font-medium text-sm">{s.job_title}</div>
                        <div className="text-gray-500 text-xs mt-0.5">{new Date(s.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm px-2.5 py-1 rounded-lg font-medium ${recColor(s.hire_recommendation)}`}>
                          {recLabel(s.hire_recommendation)}
                        </span>
                        <span className={`font-bold text-lg ${scoreColor(s.overall_score)}`}>{s.overall_score}%</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
