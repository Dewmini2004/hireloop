import { useState, useEffect, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { interviewAPI } from '../services/api'
import { Send, Loader, Mic, MicOff } from 'lucide-react'

export default function Interview() {
  const { sessionId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()

  const [messages, setMessages] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ answered: 0, total: 0 })
  const [complete, setComplete] = useState(false)
  const [listening, setListening] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (state?.sessionData) {
      const { message, first_question, total_questions } = state.sessionData
      setMessages([{ role: 'ai', content: message }])
      if (first_question) {
        setMessages(m => [...m, { role: 'ai', content: first_question.question, questionId: first_question.id }])
        setCurrentQuestion(first_question)
      }
      setProgress({ answered: 0, total: total_questions })
    }
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const submitAnswer = async () => {
    if (!answer.trim() || loading || !currentQuestion) return
    const userAnswer = answer.trim()
    setAnswer('')
    setMessages(m => [...m, { role: 'user', content: userAnswer }])
    setLoading(true)

    try {
      const conversationHistory = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }))

      const res = await interviewAPI.answer({
        session_id: sessionId,
        question_id: currentQuestion.id,
        answer: userAnswer,
        conversation_history: conversationHistory
      })

      const { ai_response, next_question, progress: prog, interview_complete } = res.data
      setMessages(m => [...m, { role: 'ai', content: ai_response }])
      setProgress(prog)

      if (interview_complete) {
        setComplete(true)
        setMessages(m => [...m, { role: 'ai', content: "That wraps up our interview! You did great. I'm now generating your detailed evaluation report — this will take a moment." }])
        await interviewAPI.complete(sessionId)
        setTimeout(() => navigate(`/results/${sessionId}`), 3000)
      } else if (next_question) {
        setMessages(m => [...m, { role: 'ai', content: next_question.question, questionId: next_question.id }])
        setCurrentQuestion(next_question)
      }
    } catch {
      setMessages(m => [...m, { role: 'ai', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window)) return
    if (listening) { setListening(false); return }
    const recognition = new window.webkitSpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (e) => { setAnswer(e.results[0][0].transcript); setListening(false) }
    recognition.onerror = () => setListening(false)
    recognition.start()
    setListening(true)
  }

  const progressPct = progress.total > 0 ? Math.round((progress.answered / progress.total) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-900 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-sm">{state?.parsed?.role_title || 'Interview'}</h1>
            <p className="text-gray-500 text-xs">{progress.answered}/{progress.total} questions answered</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-gray-400 text-xs font-medium">{progressPct}%</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-brand-500 text-white rounded-br-md'
                  : 'bg-gray-900 border border-gray-800 text-gray-200 rounded-bl-md'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      {!complete && (
        <div className="border-t border-gray-900 px-6 py-4">
          <div className="max-w-3xl mx-auto flex gap-3">
            <button onClick={toggleVoice} className={`p-3 rounded-xl border transition-colors ${listening ? 'border-red-500 text-red-400' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
              {listening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <textarea
              className="input flex-1 resize-none"
              rows={2}
              placeholder="Type your answer..."
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAnswer() } }}
              disabled={loading}
            />
            <button onClick={submitAnswer} disabled={!answer.trim() || loading} className="btn-primary px-4 py-2 self-end">
              {loading ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <p className="text-center text-gray-600 text-xs mt-2">Press Enter to send · Shift+Enter for new line</p>
        </div>
      )}
    </div>
  )
}
