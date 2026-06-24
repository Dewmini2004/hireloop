import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { jobAPI, interviewAPI } from '../services/api'
import { Zap, ArrowLeft, Loader, Upload, FileText, X, CheckCircle2 } from 'lucide-react'

export default function NewInterview() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('paste') // paste -> resume -> preview -> starting
  const [jd, setJd] = useState('')
  const [parsed, setParsed] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Resume state
  const [resumeFile, setResumeFile] = useState(null)
  const [resumeData, setResumeData] = useState(null)
  const [matchResult, setMatchResult] = useState(null)
  const [resumeLoading, setResumeLoading] = useState(false)
  const fileInputRef = useRef(null)

  const handleParse = async () => {
    if (jd.trim().length < 50) { setError('Please paste a more complete job description'); return }
    setLoading(true); setError('')
    try {
      const res = await jobAPI.parse(jd)
      setParsed(res.data)
      setStep('resume')
    } catch (err) {
      setError('Failed to parse job description. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf') && !file.name.toLowerCase().endsWith('.txt')) {
      setError('Please upload a PDF or TXT file')
      return
    }
    setResumeFile(file)
    setResumeLoading(true)
    setError('')
    try {
      const parseRes = await jobAPI.parseResume(file)
      setResumeData(parseRes.data)

      const matchRes = await jobAPI.matchResume(
        parseRes.data.raw_text || '',
        parsed.required_skills || [],
        parsed.role_title
      )
      setMatchResult(matchRes.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to analyze resume')
      setResumeFile(null)
    } finally {
      setResumeLoading(false)
    }
  }

  const removeResume = () => {
    setResumeFile(null)
    setResumeData(null)
    setMatchResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
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

  const matchColor = (s) => s >= 75 ? 'text-green-400' : s >= 50 ? 'text-yellow-400' : 'text-red-400'
  const matchRing = (s) => s >= 75 ? '#4ade80' : s >= 50 ? '#facc15' : '#f87171'

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

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 text-xs text-gray-500">
          <span className={step === 'paste' ? 'text-brand-500 font-medium' : ''}>1. Job description</span>
          <span>→</span>
          <span className={step === 'resume' ? 'text-brand-500 font-medium' : ''}>2. Resume (optional)</span>
          <span>→</span>
          <span className={step === 'preview' ? 'text-brand-500 font-medium' : ''}>3. Start</span>
        </div>

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

        {step === 'resume' && parsed && (
          <>
            <h1 className="text-3xl font-bold mb-2">Upload your resume</h1>
            <p className="text-gray-400 mb-8">Optional — we'll check how well it matches the <span className="text-gray-200 font-medium">{parsed.role_title}</span> role before you start.</p>

            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}

            {!resumeFile && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="card border-dashed border-2 border-gray-700 hover:border-brand-500 transition-colors cursor-pointer flex flex-col items-center justify-center py-12 mb-4"
              >
                <Upload size={28} className="text-gray-500 mb-3" />
                <p className="text-gray-300 font-medium mb-1">Click to upload resume</p>
                <p className="text-gray-500 text-xs">PDF or TXT, max 5MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            )}

            {resumeFile && resumeLoading && (
              <div className="card flex items-center gap-3 mb-4">
                <Loader size={18} className="text-brand-500 animate-spin shrink-0" />
                <div>
                  <p className="text-sm font-medium">Analyzing {resumeFile.name}...</p>
                  <p className="text-gray-500 text-xs">Extracting skills and matching against the role</p>
                </div>
              </div>
            )}

            {resumeFile && !resumeLoading && resumeData && matchResult && (
              <div className="card mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-brand-500" />
                    <span className="text-sm font-medium">{resumeFile.name}</span>
                  </div>
                  <button onClick={removeResume} className="text-gray-500 hover:text-red-400 transition-colors">
                    <X size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-5 mb-4">
                  <div className="relative w-16 h-16 shrink-0">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="26" fill="none" stroke="#1f2937" strokeWidth="6" />
                      <circle cx="32" cy="32" r="26" fill="none" stroke={matchRing(matchResult.match_score)} strokeWidth="6"
                        strokeDasharray={`${2*Math.PI*26}`} strokeDashoffset={`${2*Math.PI*26*(1-matchResult.match_score/100)}`}
                        strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-sm font-bold ${matchColor(matchResult.match_score)}`}>{matchResult.match_score}%</span>
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed flex-1">{matchResult.summary}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-green-400 uppercase tracking-wider mb-2">Matched skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {matchResult.matched_skills?.map(s => (
                        <span key={s} className="flex items-center gap-1 bg-green-500/10 text-green-400 text-xs px-2 py-1 rounded-lg">
                          <CheckCircle2 size={10} />{s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-yellow-400 uppercase tracking-wider mb-2">Missing skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {matchResult.missing_skills?.map(s => (
                        <span key={s} className="bg-yellow-500/10 text-yellow-400 text-xs px-2 py-1 rounded-lg">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {matchResult.suggested_focus_areas?.length > 0 && (
                  <div className="border-t border-gray-800 mt-4 pt-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Focus on these during your interview</p>
                    <ul className="space-y-1">
                      {matchResult.suggested_focus_areas.map((a, i) => (
                        <li key={i} className="text-gray-400 text-sm flex items-start gap-2"><span className="text-brand-500 mt-0.5">→</span>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setStep('preview')}>
                {resumeFile ? 'Continue →' : 'Skip this step →'}
              </button>
            </div>
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

              {matchResult && (
                <div className="flex items-center gap-2 bg-gray-800/50 rounded-xl px-3 py-2 mb-4 text-sm">
                  <span className="text-gray-400">Resume match:</span>
                  <span className={`font-bold ${matchColor(matchResult.match_score)}`}>{matchResult.match_score}%</span>
                </div>
              )}

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
