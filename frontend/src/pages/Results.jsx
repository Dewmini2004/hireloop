import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { progressAPI } from '../services/api'
import { TrendingUp, Award, AlertCircle, CheckCircle, BookOpen, Plus, ArrowLeft } from 'lucide-react'

const scoreColor = (s) => s >= 80 ? 'text-green-400' : s >= 60 ? 'text-yellow-400' : 'text-red-400'
const scoreRing = (s) => s >= 80 ? '#4ade80' : s >= 60 ? '#facc15' : '#f87171'
const recConfig = {
  strong_yes: { label: 'Strong hire', class: 'bg-green-500/10 text-green-400 border-green-500/20' },
  yes: { label: 'Hire', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  maybe: { label: 'Maybe', class: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  no: { label: 'Not ready', class: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

export default function Results() {
  const { sessionId } = useParams()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(false)

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await progressAPI.session(sessionId)
        setResult(res.data)
        setLoading(false)
      } catch {
        // Not ready yet, poll
        setPolling(true)
        setTimeout(fetchResult, 3000)
      }
    }
    fetchResult()
  }, [sessionId])

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
      <p className="text-gray-400">{polling ? 'Generating your evaluation report...' : 'Loading results...'}</p>
      <p className="text-gray-600 text-sm">This may take up to 30 seconds</p>
    </div>
  )

  const ev = result.evaluation
  const rec = recConfig[ev.hire_recommendation] || recConfig.maybe

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-900">
        <Link to="/dashboard" className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <Link to="/interview/new" className="btn-primary text-sm py-2 flex items-center gap-1.5">
          <Plus size={14} /> New interview
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-8 py-10">
        <h1 className="text-3xl font-bold mb-1">Interview results</h1>
        <p className="text-gray-400 mb-8">{result.job_title} · {new Date(result.created_at).toLocaleDateString()}</p>

        {/* Score Card */}
        <div className="card mb-6 flex items-center gap-6">
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" fill="none" stroke="#1f2937" strokeWidth="8" />
              <circle cx="48" cy="48" r="40" fill="none" stroke={scoreRing(ev.overall_score)} strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 40}`} strokeDashoffset={`${2 * Math.PI * 40 * (1 - ev.overall_score / 100)}`}
                strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${scoreColor(ev.overall_score)}`}>{ev.overall_score}</span>
            </div>
          </div>
          <div className="flex-1">
            <div className={`inline-flex items-center border text-sm font-medium px-3 py-1.5 rounded-lg mb-2 ${rec.class}`}>{rec.label}</div>
            <p className="text-gray-300 text-sm leading-relaxed">{ev.summary}</p>
          </div>
        </div>

        {/* Strengths & Improvements */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="card">
            <div className="flex items-center gap-2 mb-3"><CheckCircle size={16} className="text-green-400" /><h3 className="font-semibold text-sm">Strengths</h3></div>
            <ul className="space-y-2">
              {ev.strengths?.map((s, i) => <li key={i} className="text-gray-400 text-sm flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span>{s}</li>)}
            </ul>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-3"><AlertCircle size={16} className="text-yellow-400" /><h3 className="font-semibold text-sm">Areas to improve</h3></div>
            <ul className="space-y-2">
              {ev.improvement_areas?.map((a, i) => <li key={i} className="text-gray-400 text-sm flex items-start gap-2"><span className="text-yellow-400 mt-0.5">→</span>{a}</li>)}
            </ul>
          </div>
        </div>

        {/* Skill Gap */}
        {ev.skill_gap_analysis && (
          <div className="card mb-6">
            <div className="flex items-center gap-2 mb-4"><TrendingUp size={16} className="text-brand-500" /><h3 className="font-semibold">Skill gap analysis</h3></div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {[
                { label: 'Strong', skills: ev.skill_gap_analysis.strong_skills, color: 'text-green-400' },
                { label: 'Needs work', skills: ev.skill_gap_analysis.weak_skills, color: 'text-yellow-400' },
                { label: 'Missing', skills: ev.skill_gap_analysis.missing_skills, color: 'text-red-400' },
              ].map(({ label, skills, color }) => (
                <div key={label}>
                  <p className={`text-xs font-medium ${color} uppercase tracking-wider mb-2`}>{label}</p>
                  <div className="space-y-1">{skills?.map(s => <div key={s} className="bg-gray-800 rounded-lg px-2 py-1 text-gray-300 text-xs">{s}</div>)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-answer scores */}
        <div className="card mb-6">
          <h3 className="font-semibold mb-4">Answer breakdown</h3>
          <div className="space-y-4">
            {ev.per_answer_scores?.map((a, i) => (
              <div key={i} className="border-b border-gray-800 last:border-0 pb-4 last:pb-0">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <p className="text-sm text-gray-300 flex-1">{a.question}</p>
                  <span className={`text-lg font-bold shrink-0 ${scoreColor(a.score * 10)}`}>{a.score}/10</span>
                </div>
                <p className="text-gray-400 text-xs mb-1">{a.feedback}</p>
                {a.what_was_missing && <p className="text-gray-600 text-xs">Missing: {a.what_was_missing}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Resources */}
        {ev.recommended_resources?.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4"><BookOpen size={16} className="text-brand-500" /><h3 className="font-semibold">Recommended next steps</h3></div>
            <div className="space-y-3">
              {ev.recommended_resources.map((r, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-800 rounded-xl">
                  <span className="bg-brand-500/10 text-brand-500 text-xs px-2 py-0.5 rounded-md mt-0.5 shrink-0 capitalize">{r.resource_type}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{r.topic}</p>
                    <p className="text-gray-500 text-xs">{r.suggestion}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
