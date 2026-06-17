import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { jobAPI, interviewAPI } from '../services/api'
import { Zap, ArrowLeft, Loader } from 'lucide-react'
import { Link } from 'react-router-dom'

const STEPS = ['paste', 'preview', 'starting']

export default function NewInterview() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('paste')
  const [jd, setJd] = useState('')
  const [parsed, setParsed] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleParse = async () => {
    if (jd.trim().length < 50) { setError('Please paste a more complete job description'); return }
    setLoading(true); setError('')
    try {
      const res = await jobAPI.parse(jd)
      setParsed(res.data)
      setStep('preview')
    } catch (err) {
      setError('Failed to parse job description. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleStart = async () => {
    setLoading(true); setStep('starting')
    try {
      const res = await interviewAPI.start({
        user_id: user.id,
        user_name: user.name,
        job_title: parsed.role_title,
        question_bank: parsed.question_bank
      })
      navigate(`/interview/${res.data.session_id}`, { state: { sessionData: res.data, parsed } })
    } catch {
      setError('Failed to start interview. Try again.')
      setStep('preview')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-900">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center"><Zap size={16} /></div>
          <span className="font-bold text-lg">HireLoop</span>
        </div>
        <Link to="/dashboard" className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-8 py-12">
        {step === 'paste' && (
          <>
            <h1 className="text-3xl font-bold mb-2">Paste a job description</h1>
            <p className="text-gray-400 mb-8">We'll analyze it and create a tailored interview just for that role.</p>
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}
            <textarea
              className="input resize-none mb-4"
              rows={14}
              placeholder="Paste the full job description here — the more detail you include, the better your interview will be..."
              value={jd}
              onChange={e => setJd(e.target.value)}
            />
            <button className="btn-primary w-full" onClick={handleParse} disabled={loading}>
              {loading ? <span className="flex items-center justify-center gap-2"><Loader size={16} className="animate-spin" /> Analyzing role...</span> : 'Analyze job description →'}
            </button>
          </>
        )}

        {step === 'preview' && parsed && (
          <>
            <h1 className="text-3xl font-bold mb-2">Role analyzed</h1>
            <p className="text-gray-400 mb-8">Here's what we found. Ready to start your interview?</p>
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">{parsed.role_title}</h2>
                <span className="bg-brand-500/10 text-brand-500 text-xs font-medium px-3 py-1 rounded-full capitalize">{parsed.seniority_level}</span>
              </div>
              <div className="mb-4">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Required skills</p>
                <div className="flex flex-wrap gap-2">
                  {parsed.required_skills.map(s => (
                    <span key={s} className="bg-gray-800 text-gray-300 text-xs px-3 py-1.5 rounded-lg">{s}</span>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-800 pt-4 flex items-center justify-between text-sm text-gray-400">
                <span>{parsed.question_bank?.length} questions ready</span>
                <span>~{Math.round((parsed.question_bank?.length || 10) * 3)} min estimated</span>
              </div>
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setStep('paste')}>Change JD</button>
              <button className="btn-primary flex-1" onClick={handleStart} disabled={loading}>
                {loading ? 'Starting...' : 'Start interview →'}
              </button>
            </div>
          </>
        )}

        {step === 'starting' && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Loader size={28} className="text-brand-500 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Setting up your interview</h2>
            <p className="text-gray-400">Preparing your AI interviewer...</p>
          </div>
        )}
      </div>
    </div>
  )
}
