import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI, progressAPI } from '../services/api'
import { Users, Building2, BarChart2, TrendingUp, Shield, LogOut, Plus, ToggleLeft, ToggleRight, Zap, Activity, Award } from 'lucide-react'

const scoreColor = s => s >= 80 ? 'text-green-400' : s >= 60 ? 'text-yellow-400' : 'text-red-400'
const recBadge = r => ({ strong_yes:'bg-green-500/10 text-green-400', yes:'bg-blue-500/10 text-blue-400', maybe:'bg-yellow-500/10 text-yellow-400', no:'bg-red-500/10 text-red-400' })[r] || 'bg-gray-800 text-gray-400'
const recLabel = r => ({ strong_yes:'Strong hire', yes:'Hire', maybe:'Maybe', no:'Not ready' })[r] || r

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [authStats, setAuthStats] = useState(null)
  const [progressStats, setProgressStats] = useState(null)
  const [users, setUsers] = useState([])
  const [companies, setCompanies] = useState([])
  const [sessions, setSessions] = useState([])
  const [dailyData, setDailyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddCompany, setShowAddCompany] = useState(false)
  const [newCompany, setNewCompany] = useState({ name:'', email:'', plan:'starter', max_candidates:50 })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [aStats, pStats, usersRes, companiesRes, sessionsRes, dailyRes] = await Promise.all([
        authAPI.adminStats(),
        progressAPI.adminStats(),
        authAPI.adminUsers({ limit: 50 }),
        authAPI.getCompanies(),
        progressAPI.allSessions({ limit: 20 }),
        fetch('http://localhost:4000/api/progress/admin/daily', { headers: { Authorization: `Bearer ${localStorage.getItem('hireloop_token')}` } }).then(r => r.json()),
      ])
      setAuthStats(aStats.data)
      setProgressStats(pStats.data)
      setUsers(usersRes.data.users)
      setCompanies(companiesRes.data)
      setSessions(sessionsRes.data.sessions)
      setDailyData(Array.isArray(dailyRes) ? dailyRes : [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const toggleUser = async (id) => {
    await authAPI.toggleUser(id)
    setUsers(u => u.map(x => x.id === id ? { ...x, is_active: !x.is_active } : x))
  }

  const addCompany = async () => {
    await authAPI.createCompany(newCompany)
    setShowAddCompany(false)
    setNewCompany({ name:'', email:'', plan:'starter', max_candidates:50 })
    loadData()
  }

  const handleLogout = () => { logout(); navigate('/') }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'sessions', label: 'Interviews', icon: Activity },
  ]

  // Simple bar chart using divs
  const maxCount = Math.max(...dailyData.map(d => parseInt(d.count) || 0), 1)

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <div className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-800">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center"><Shield size={15} /></div>
          <div>
            <div className="font-bold text-sm">HireLoop</div>
            <div className="text-red-400 text-xs">Admin Panel</div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${tab===id ? 'bg-red-500/10 text-red-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              <Icon size={16} />{label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="text-xs text-gray-500 mb-1">{user?.name}</div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-gray-500 hover:text-white text-xs transition-colors">
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div></div>
          ) : (
            <>
              {/* OVERVIEW */}
              {tab === 'overview' && (
                <div>
                  <h1 className="text-2xl font-bold mb-1">Platform Overview</h1>
                  <p className="text-gray-400 text-sm mb-8">Real-time stats across all users and companies</p>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                      { label: 'Total Users', value: authStats?.total_users || 0, icon: Users, color: 'text-blue-400' },
                      { label: 'Companies', value: authStats?.total_companies || 0, icon: Building2, color: 'text-purple-400' },
                      { label: 'Total Interviews', value: progressStats?.total_interviews || 0, icon: Activity, color: 'text-green-400' },
                      { label: 'Avg Score', value: `${progressStats?.avg_score || 0}%`, icon: TrendingUp, color: 'text-yellow-400' },
                    ].map(({ label, value, icon: Icon, color }) => (
                      <div key={label} className="card">
                        <Icon size={18} className={`${color} mb-3`} />
                        <div className="text-2xl font-bold mb-0.5">{value}</div>
                        <div className="text-gray-500 text-xs">{label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    {/* Activity chart */}
                    <div className="card">
                      <h3 className="font-semibold mb-4 text-sm">Interviews — Last 14 Days</h3>
                      {dailyData.length === 0 ? (
                        <div className="text-gray-600 text-sm text-center py-8">No data yet</div>
                      ) : (
                        <div className="flex items-end gap-1.5 h-32">
                          {dailyData.map((d, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <div className="w-full bg-red-500/70 rounded-t-sm transition-all"
                                style={{ height: `${(parseInt(d.count)/maxCount)*100}%`, minHeight: '4px' }}
                                title={`${d.date}: ${d.count} interviews`} />
                              <span className="text-gray-600 text-xs" style={{ fontSize: '9px' }}>
                                {new Date(d.date).getDate()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Score distribution */}
                    <div className="card">
                      <h3 className="font-semibold mb-4 text-sm">Score Distribution</h3>
                      {progressStats?.score_distribution && (
                        <div className="space-y-3">
                          {[
                            { label: 'Excellent (80-100)', count: progressStats.score_distribution.excellent, color: 'bg-green-500' },
                            { label: 'Good (60-79)', count: progressStats.score_distribution.good, color: 'bg-yellow-500' },
                            { label: 'Needs Work (<60)', count: progressStats.score_distribution.needs_work, color: 'bg-red-500' },
                          ].map(({ label, count, color }) => {
                            const total = progressStats.total_interviews || 1
                            const pct = Math.round((count/total)*100)
                            return (
                              <div key={label}>
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                  <span>{label}</span><span>{count} ({pct}%)</span>
                                </div>
                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                  <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top roles + recent users */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="card">
                      <h3 className="font-semibold mb-4 text-sm">Top Job Roles Practiced</h3>
                      <div className="space-y-2">
                        {progressStats?.top_job_roles?.map((j, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
                            <span className="text-sm text-gray-300">{j.job_title}</span>
                            <span className="text-gray-500 text-xs">{j.count} interviews</span>
                          </div>
                        ))}
                        {!progressStats?.top_job_roles?.length && <p className="text-gray-600 text-sm">No data yet</p>}
                      </div>
                    </div>
                    <div className="card">
                      <h3 className="font-semibold mb-4 text-sm">Recent Sign-ups</h3>
                      <div className="space-y-2">
                        {authStats?.recent_users?.map(u => (
                          <div key={u.id} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
                            <div>
                              <div className="text-sm text-gray-300">{u.name}</div>
                              <div className="text-gray-600 text-xs">{u.email}</div>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-md ${u.role==='admin'?'bg-red-500/10 text-red-400':u.role==='hr'?'bg-purple-500/10 text-purple-400':'bg-gray-800 text-gray-400'}`}>{u.role}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* USERS */}
              {tab === 'users' && (
                <div>
                  <h1 className="text-2xl font-bold mb-1">User Management</h1>
                  <p className="text-gray-400 text-sm mb-6">{users.length} total users</p>
                  <div className="card overflow-hidden p-0">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-800">
                        <tr className="text-gray-500 text-xs uppercase tracking-wider">
                          <th className="text-left px-6 py-4">User</th>
                          <th className="text-left px-4 py-4">Role</th>
                          <th className="text-left px-4 py-4">Joined</th>
                          <th className="text-left px-4 py-4">Status</th>
                          <th className="text-left px-4 py-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                            <td className="px-6 py-3">
                              <div className="font-medium text-gray-200">{u.name}</div>
                              <div className="text-gray-500 text-xs">{u.email}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-1 rounded-md ${u.role==='admin'?'bg-red-500/10 text-red-400':u.role==='hr'?'bg-purple-500/10 text-purple-400':'bg-gray-800 text-gray-400'}`}>{u.role}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-1 rounded-md ${u.is_active?'bg-green-500/10 text-green-400':'bg-red-500/10 text-red-400'}`}>
                                {u.is_active ? 'Active' : 'Suspended'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {u.role !== 'admin' && (
                                <button onClick={() => toggleUser(u.id)} className="text-gray-500 hover:text-white transition-colors">
                                  {u.is_active ? <ToggleRight size={20} className="text-green-400" /> : <ToggleLeft size={20} />}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* COMPANIES */}
              {tab === 'companies' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h1 className="text-2xl font-bold mb-1">Companies</h1>
                      <p className="text-gray-400 text-sm">{companies.length} registered companies</p>
                    </div>
                    <button onClick={() => setShowAddCompany(true)} className="btn-primary flex items-center gap-2 text-sm py-2">
                      <Plus size={14} /> Add Company
                    </button>
                  </div>

                  {showAddCompany && (
                    <div className="card mb-6 border-red-500/20">
                      <h3 className="font-semibold mb-4">Add New Company</h3>
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1.5">Company Name</label>
                          <input className="input text-sm" placeholder="Acme Corp" value={newCompany.name} onChange={e=>setNewCompany({...newCompany,name:e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1.5">HR Email</label>
                          <input className="input text-sm" placeholder="hr@acme.com" value={newCompany.email} onChange={e=>setNewCompany({...newCompany,email:e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1.5">Plan</label>
                          <select className="input text-sm" value={newCompany.plan} onChange={e=>setNewCompany({...newCompany,plan:e.target.value})}>
                            <option value="trial">Trial (Free)</option>
                            <option value="starter">Starter ($99/mo)</option>
                            <option value="growth">Growth ($299/mo)</option>
                            <option value="enterprise">Enterprise (Custom)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1.5">Max Candidates</label>
                          <input className="input text-sm" type="number" value={newCompany.max_candidates} onChange={e=>setNewCompany({...newCompany,max_candidates:parseInt(e.target.value)})} />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={addCompany} className="btn-primary text-sm py-2">Create Company</button>
                        <button onClick={() => setShowAddCompany(false)} className="btn-secondary text-sm py-2">Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    {companies.map(c => (
                      <div key={c.id} className="card hover:border-gray-700 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">{c.name}</h3>
                            <p className="text-gray-500 text-xs">{c.email}</p>
                          </div>
                          <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${c.plan==='enterprise'?'bg-yellow-500/10 text-yellow-400':c.plan==='growth'?'bg-purple-500/10 text-purple-400':'bg-blue-500/10 text-blue-400'}`}>
                            {c.plan}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-800">
                          <span>Max {c.max_candidates} candidates</span>
                          <span>Since {new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                    {!companies.length && (
                      <div className="col-span-2 card text-center py-12">
                        <Building2 size={32} className="text-gray-700 mx-auto mb-3" />
                        <p className="text-gray-500 mb-4">No companies yet</p>
                        <button onClick={() => setShowAddCompany(true)} className="btn-primary text-sm py-2 inline-flex items-center gap-2"><Plus size={14} />Add first company</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SESSIONS */}
              {tab === 'sessions' && (
                <div>
                  <h1 className="text-2xl font-bold mb-1">All Interviews</h1>
                  <p className="text-gray-400 text-sm mb-6">Every interview conducted on the platform</p>
                  <div className="card overflow-hidden p-0">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-800">
                        <tr className="text-gray-500 text-xs uppercase tracking-wider">
                          <th className="text-left px-6 py-4">Candidate</th>
                          <th className="text-left px-4 py-4">Role</th>
                          <th className="text-left px-4 py-4">Score</th>
                          <th className="text-left px-4 py-4">Result</th>
                          <th className="text-left px-4 py-4">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map(s => (
                          <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                            <td className="px-6 py-3 text-gray-300">{s.user_name || s.user_id.slice(0,8)+'...'}</td>
                            <td className="px-4 py-3 text-gray-400 text-xs">{s.job_title}</td>
                            <td className="px-4 py-3"><span className={`font-bold ${scoreColor(s.overall_score)}`}>{s.overall_score}%</span></td>
                            <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-md ${recBadge(s.hire_recommendation)}`}>{recLabel(s.hire_recommendation)}</span></td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{new Date(s.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                        {!sessions.length && (
                          <tr><td colSpan={5} className="text-center py-12 text-gray-600">No interviews yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
