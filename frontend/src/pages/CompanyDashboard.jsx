import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI, progressAPI } from '../services/api'
import { Users, Send, BarChart2, TrendingUp, LogOut, Copy, CheckCircle, Briefcase, Link2, ClipboardList } from 'lucide-react'

const scoreColor = s => s >= 80 ? 'text-green-400' : s >= 60 ? 'text-yellow-400' : 'text-red-400'
const scoreRing = s => s >= 80 ? '#4ade80' : s >= 60 ? '#facc15' : '#f87171'
const recBadge = r => ({ strong_yes:'bg-green-500/10 text-green-400 border-green-500/20', yes:'bg-blue-500/10 text-blue-400 border-blue-500/20', maybe:'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', no:'bg-red-500/10 text-red-400 border-red-500/20' })[r] || 'bg-gray-800 text-gray-400 border-gray-700'
const recLabel = r => ({ strong_yes:'Strong Hire ✓', yes:'Hire', maybe:'Maybe', no:'Not Ready' })[r] || r

export default function CompanyDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [companyStats, setCompanyStats] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [sessions, setSessions] = useState([])
  const [sessionStats, setSessionStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [inviteForm, setInviteForm] = useState({ email: '', job_title: '' })
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsRes, candidatesRes, sessionsRes] = await Promise.all([
        authAPI.getCompanyStats(),
        authAPI.getCompanyCandidates(),
        progressAPI.companySessions(user.company_id),
      ])
      setCompanyStats(statsRes.data)
      setCandidates(candidatesRes.data)
      setSessions(sessionsRes.data.sessions)
      setSessionStats(sessionsRes.data.stats)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const sendInvite = async () => {
    if (!inviteForm.email || !inviteForm.job_title) return
    setInviting(true)
    try {
      const res = await authAPI.inviteCandidate(inviteForm)
      setInviteLink(res.data.invite_link)
      setInviteForm({ email: '', job_title: '' })
    } catch (e) { console.error(e) }
    setInviting(false)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getCandidateSessions = (candidateId) =>
    sessions.filter(s => s.user_id === candidateId)

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'candidates', label: 'Candidates', icon: Users },
    { id: 'invite', label: 'Invite', icon: Send },
    { id: 'compare', label: 'Compare', icon: TrendingUp },
  ]

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <div className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center"><Briefcase size={15} /></div>
            <div>
              <div className="font-bold text-sm">{companyStats?.company?.name || 'Company'}</div>
              <div className="text-purple-400 text-xs">HR Dashboard</div>
            </div>
          </div>
          {companyStats?.company?.plan && (
            <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-md capitalize">{companyStats.company.plan} plan</span>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${tab===id?'bg-purple-500/10 text-purple-400':'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              <Icon size={16} />{label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="text-xs text-gray-500 mb-1">{user?.name}</div>
          <button onClick={() => { logout(); navigate('/') }} className="flex items-center gap-1.5 text-gray-500 hover:text-white text-xs">
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div></div>
          ) : (
            <>
              {/* OVERVIEW */}
              {tab === 'overview' && (
                <div>
                  <h1 className="text-2xl font-bold mb-1">Overview</h1>
                  <p className="text-gray-400 text-sm mb-8">Your hiring pipeline at a glance</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                      { label: 'Candidates', value: companyStats?.total_candidates || 0, icon: Users, color: 'text-purple-400' },
                      { label: 'Invites Sent', value: companyStats?.total_invites || 0, icon: Send, color: 'text-blue-400' },
                      { label: 'Interviews Done', value: sessionStats?.total || 0, icon: ClipboardList, color: 'text-green-400' },
                      { label: 'Avg Score', value: `${sessionStats?.avg_score || 0}%`, icon: TrendingUp, color: 'text-yellow-400' },
                    ].map(({ label, value, icon: Icon, color }) => (
                      <div key={label} className="card">
                        <Icon size={18} className={`${color} mb-3`} />
                        <div className="text-2xl font-bold mb-0.5">{value}</div>
                        <div className="text-gray-500 text-xs">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Hiring funnel */}
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="card">
                      <h3 className="font-semibold mb-4 text-sm">Hiring Recommendation Breakdown</h3>
                      {sessions.length === 0 ? (
                        <p className="text-gray-600 text-sm text-center py-8">No interviews yet</p>
                      ) : (
                        <div className="space-y-3">
                          {[
                            { label: 'Strong Hire', key: 'strong_yes', color: 'bg-green-500' },
                            { label: 'Hire', key: 'yes', color: 'bg-blue-500' },
                            { label: 'Maybe', key: 'maybe', color: 'bg-yellow-500' },
                            { label: 'Not Ready', key: 'no', color: 'bg-red-500' },
                          ].map(({ label, key, color }) => {
                            const count = sessions.filter(s => s.hire_recommendation === key).length
                            const pct = sessions.length ? Math.round((count/sessions.length)*100) : 0
                            return (
                              <div key={key}>
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

                    {/* Top candidates */}
                    <div className="card">
                      <h3 className="font-semibold mb-4 text-sm">Top Performers</h3>
                      <div className="space-y-2">
                        {sessions
                          .sort((a, b) => b.overall_score - a.overall_score)
                          .slice(0, 5)
                          .map((s, i) => (
                            <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
                              <div className="flex items-center gap-3">
                                <span className="text-gray-600 text-xs w-4">{i+1}</span>
                                <div>
                                  <div className="text-sm text-gray-300">{s.user_name || 'Candidate'}</div>
                                  <div className="text-gray-600 text-xs">{s.job_title}</div>
                                </div>
                              </div>
                              <span className={`font-bold text-sm ${scoreColor(s.overall_score)}`}>{s.overall_score}%</span>
                            </div>
                          ))}
                        {!sessions.length && <p className="text-gray-600 text-sm">No interviews yet</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CANDIDATES */}
              {tab === 'candidates' && (
                <div>
                  <h1 className="text-2xl font-bold mb-1">Candidates</h1>
                  <p className="text-gray-400 text-sm mb-6">{candidates.length} candidates in your pipeline</p>

                  {!candidates.length ? (
                    <div className="card text-center py-16">
                      <Users size={40} className="text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-400 mb-2">No candidates yet</p>
                      <p className="text-gray-600 text-sm mb-6">Use the Invite tab to bring candidates in</p>
                      <button onClick={() => setTab('invite')} className="btn-primary text-sm py-2 inline-flex items-center gap-2"><Send size={14} />Invite candidates</button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {candidates.map(c => {
                        const cSessions = getCandidateSessions(c.id)
                        const best = cSessions.sort((a,b) => b.overall_score - a.overall_score)[0]
                        return (
                          <div key={c.id} className="card hover:border-gray-700 transition-colors cursor-pointer"
                            onClick={() => setSelectedCandidate(selectedCandidate?.id === c.id ? null : c)}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 font-semibold">
                                  {c.name[0].toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-medium">{c.name}</div>
                                  <div className="text-gray-500 text-xs">{c.email}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-gray-500 text-xs">{cSessions.length} interviews</div>
                                  {best && <div className={`font-bold text-sm ${scoreColor(best.overall_score)}`}>Best: {best.overall_score}%</div>}
                                </div>
                                {best && (
                                  <span className={`text-xs px-2.5 py-1 rounded-lg border ${recBadge(best.hire_recommendation)}`}>
                                    {recLabel(best.hire_recommendation)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Expanded sessions */}
                            {selectedCandidate?.id === c.id && cSessions.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-800 space-y-2">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Interview History</p>
                                {cSessions.map(s => (
                                  <div key={s.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-2.5">
                                    <div>
                                      <div className="text-sm text-gray-300">{s.job_title}</div>
                                      <div className="text-gray-600 text-xs">{new Date(s.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className={`font-bold ${scoreColor(s.overall_score)}`}>{s.overall_score}%</span>
                                      <span className={`text-xs px-2 py-0.5 rounded-md border ${recBadge(s.hire_recommendation)}`}>{recLabel(s.hire_recommendation)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* INVITE */}
              {tab === 'invite' && (
                <div className="max-w-xl">
                  <h1 className="text-2xl font-bold mb-1">Invite Candidates</h1>
                  <p className="text-gray-400 text-sm mb-8">Send a personalized interview link to any candidate</p>

                  <div className="card mb-6">
                    <h3 className="font-semibold mb-4">Generate Invite Link</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1.5">Candidate Email</label>
                        <input className="input" placeholder="candidate@gmail.com" value={inviteForm.email} onChange={e=>setInviteForm({...inviteForm,email:e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1.5">Job Title they're applying for</label>
                        <input className="input" placeholder="e.g. Senior React Developer" value={inviteForm.job_title} onChange={e=>setInviteForm({...inviteForm,job_title:e.target.value})} />
                      </div>
                      <button className="btn-primary w-full flex items-center justify-center gap-2" onClick={sendInvite} disabled={inviting || !inviteForm.email || !inviteForm.job_title}>
                        {inviting ? 'Generating...' : <><Link2 size={16} /> Generate Invite Link</>}
                      </button>
                    </div>
                  </div>

                  {inviteLink && (
                    <div className="card border-green-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle size={16} className="text-green-400" />
                        <span className="font-semibold text-green-400 text-sm">Invite link ready!</span>
                      </div>
                      <p className="text-gray-400 text-xs mb-3">Share this link with your candidate. They'll register and be automatically linked to your company.</p>
                      <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-4 py-3">
                        <span className="text-gray-300 text-xs flex-1 truncate">{inviteLink}</span>
                        <button onClick={copyLink} className="text-gray-400 hover:text-white shrink-0">
                          {copied ? <CheckCircle size={16} className="text-green-400" /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="card mt-6">
                    <h3 className="font-semibold text-sm mb-3">How it works</h3>
                    <div className="space-y-3">
                      {[
                        'Enter candidate email and the role they\'re applying for',
                        'A unique invite link is generated for that candidate',
                        'Candidate registers using the link — auto-linked to your company',
                        'They practice interviews — you see all their scores here',
                      ].map((step, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm text-gray-400">
                          <span className="w-5 h-5 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">{i+1}</span>
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* COMPARE */}
              {tab === 'compare' && (
                <div>
                  <h1 className="text-2xl font-bold mb-1">Compare Candidates</h1>
                  <p className="text-gray-400 text-sm mb-6">Side-by-side ranking of all candidates by score</p>

                  {!sessions.length ? (
                    <div className="card text-center py-16">
                      <BarChart2 size={40} className="text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-500">No interview data yet</p>
                    </div>
                  ) : (
                    <div className="card overflow-hidden p-0">
                      <table className="w-full text-sm">
                        <thead className="border-b border-gray-800">
                          <tr className="text-gray-500 text-xs uppercase tracking-wider">
                            <th className="text-left px-6 py-4">Rank</th>
                            <th className="text-left px-4 py-4">Candidate</th>
                            <th className="text-left px-4 py-4">Role</th>
                            <th className="text-left px-4 py-4">Score</th>
                            <th className="text-left px-4 py-4">Recommendation</th>
                            <th className="text-left px-4 py-4">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...sessions]
                            .sort((a,b) => b.overall_score - a.overall_score)
                            .map((s, i) => (
                              <tr key={s.id} className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${i===0?'bg-yellow-500/5':''}`}>
                                <td className="px-6 py-3">
                                  <span className={`font-bold text-lg ${i===0?'text-yellow-400':i===1?'text-gray-400':i===2?'text-orange-700':'text-gray-700'}`}>
                                    #{i+1}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-200">{s.user_name || 'Candidate'}</td>
                                <td className="px-4 py-3 text-gray-400 text-xs">{s.job_title}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${s.overall_score>=80?'bg-green-500':s.overall_score>=60?'bg-yellow-500':'bg-red-500'}`}
                                        style={{ width: `${s.overall_score}%` }} />
                                    </div>
                                    <span className={`font-bold ${scoreColor(s.overall_score)}`}>{s.overall_score}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`text-xs px-2.5 py-1 rounded-lg border ${recBadge(s.hire_recommendation)}`}>
                                    {recLabel(s.hire_recommendation)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(s.created_at).toLocaleDateString()}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
