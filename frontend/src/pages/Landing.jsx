import { Link } from 'react-router-dom'
import { Zap, Target, TrendingUp, ChevronRight, Brain, Award } from 'lucide-react'

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-900">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg">HireLoop</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-gray-400 hover:text-white transition-colors text-sm">Sign in</Link>
          <Link to="/register" className="btn-primary text-sm py-2 px-4">Get started free</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-8 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-2 text-brand-500 text-sm font-medium mb-8">
          <Brain size={14} />
          AI-powered interview practice
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
          Practice for the exact job<br />
          <span className="text-brand-500">you're applying to</span>
        </h1>
        <p className="text-gray-400 text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
          Paste any job description. Get interviewed by AI that adapts to your answers, just like a real interview. Know exactly where you stand before the real thing.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/register" className="btn-primary flex items-center gap-2 text-base">
            Start practicing free <ChevronRight size={18} />
          </Link>
          <Link to="/login" className="btn-secondary text-base">Sign in</Link>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-8 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Target, title: 'Role-specific questions', desc: 'AI reads your job description and generates questions tailored to that exact role, company level, and skill set.' },
            { icon: Brain, title: 'Adaptive AI interviewer', desc: 'The AI follows up, pushes back, and digs deeper based on your answers — just like a real interviewer would.' },
            { icon: TrendingUp, title: 'Gap analysis report', desc: 'Every session ends with a detailed scorecard: what you nailed, what you missed, and what to study next.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card hover:border-gray-700 transition-colors">
              <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center mb-4">
                <Icon size={20} className="text-brand-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-900 px-8 py-8 text-center text-gray-600 text-sm">
        © 2025 HireLoop. Built with microservices architecture.
      </div>
    </div>
  )
}
