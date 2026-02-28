import { useState } from 'react'

export default function HowItWorks({ stats }) {
  const [open, setOpen] = useState(false)

  const postings = stats?.job_postings_analyzed ?? '—'
  const courses = stats?.courses_fingerprinted ?? '—'
  const dataSources = stats?.data_sources ?? 'LinkedIn, Indeed (job postings); syllabi.engineering.osu.edu (course data)'

  const cards = [
    {
      icon: '📊',
      color: 'ibm-blue',
      title: 'Real Market Intelligence',
      body: `We analyzed ${postings} real job postings from companies like JPMorgan, Amazon, and Google using IBM Granite to build a live skill demand index.`,
      detail: `Data sources: ${dataSources}`,
      badge: 'Stage 1',
    },
    {
      icon: '🎓',
      color: 'ibm-cyan',
      title: 'Course DNA Fingerprinting',
      body: `We used IBM Granite to extract skill fingerprints from ${courses} OSU courses using official syllabi, then computed semantic similarity using Granite Embeddings to detect redundancy.`,
      detail: 'Source: syllabi.engineering.osu.edu — official OSU course syllabi',
      badge: 'Stage 2',
    },
    {
      icon: '🧠',
      color: 'ibm-purple',
      title: 'Multi-Objective Optimization',
      body: 'IBM Granite runs multi-objective optimization generating 3 Pareto-optimal plans balancing career alignment, prerequisite constraints, and workload distribution.',
      detail: 'Gap scoring = demand_score × (1 − student_proficiency) per skill',
      badge: 'Stage 3',
    },
  ]

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-6 py-5 hover:bg-ibm-gray-80/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🔬</span>
          <div className="text-left">
            <h3 className="text-base font-semibold text-white">How Our AI Works</h3>
            <p className="text-ibm-gray-50 text-sm">3-stage IBM Granite pipeline — click to expand</p>
          </div>
        </div>
        <svg className={`w-5 h-5 text-ibm-gray-50 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="px-6 pb-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {cards.map((card, i) => (
              <div key={i} className="bg-ibm-gray-90 rounded-xl p-5 border border-ibm-gray-80">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{card.icon}</span>
                  <span className={`chip bg-${card.color}/10 text-${card.color} border-${card.color}/30 border text-xs`}>
                    {card.badge}
                  </span>
                </div>
                <h4 className="text-white font-semibold text-sm mb-2">{card.title}</h4>
                <p className="text-ibm-gray-30 text-xs leading-relaxed mb-3">{card.body}</p>
                <p className="text-ibm-gray-50 text-xs italic">{card.detail}</p>
              </div>
            ))}
          </div>

          {/* Pipeline diagram */}
          <div className="bg-ibm-gray-90 rounded-xl p-4 border border-ibm-gray-80">
            <div className="flex items-center justify-center gap-3 flex-wrap text-xs">
              <div className="flex items-center gap-2 bg-ibm-blue/10 border border-ibm-blue/20 rounded-lg px-3 py-2">
                <span>📄</span>
                <span className="text-ibm-blue font-mono">job_postings.json</span>
              </div>
              <span className="text-ibm-gray-50">→</span>
              <div className="flex items-center gap-2 bg-ibm-gray-80 rounded-lg px-3 py-2 border border-ibm-gray-70">
                <span className="text-ibm-gray-30">Granite</span>
                <span className="text-ibm-gray-50 font-mono text-xs">skill_extractor</span>
              </div>
              <span className="text-ibm-gray-50">→</span>
              <div className="flex items-center gap-2 bg-ibm-blue/10 border border-ibm-blue/20 rounded-lg px-3 py-2">
                <span>📊</span>
                <span className="text-ibm-blue font-mono">skill_index.json</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 flex-wrap text-xs mt-3">
              <div className="flex items-center gap-2 bg-ibm-cyan/10 border border-ibm-cyan/20 rounded-lg px-3 py-2">
                <span>🎓</span>
                <span className="text-ibm-cyan font-mono">osu_courses.json</span>
              </div>
              <span className="text-ibm-gray-50">→</span>
              <div className="flex items-center gap-2 bg-ibm-gray-80 rounded-lg px-3 py-2 border border-ibm-gray-70">
                <span className="text-ibm-gray-30">Granite + Embeddings</span>
              </div>
              <span className="text-ibm-gray-50">→</span>
              <div className="flex items-center gap-2 bg-ibm-cyan/10 border border-ibm-cyan/20 rounded-lg px-3 py-2">
                <span>🔬</span>
                <span className="text-ibm-cyan font-mono">course_fingerprints.json</span>
              </div>
              <span className="text-ibm-gray-50">→</span>
              <div className="flex items-center gap-2 bg-ibm-purple/10 border border-ibm-purple/20 rounded-lg px-3 py-2">
                <span>📋</span>
                <span className="text-ibm-purple font-mono">3 optimized plans</span>
              </div>
            </div>
          </div>

          {/* Footer models */}
          <div className="text-center mt-4">
            <p className="text-ibm-gray-70 text-xs">
              Powered by{' '}
              <span className="text-ibm-blue font-mono">ibm/granite-3-3-8b-instruct</span>
              {' '}and{' '}
              <span className="text-ibm-cyan font-mono">ibm/granite-embedding-278m-multilingual</span>
              {' '}on{' '}
              <span className="text-white font-semibold">IBM watsonx.ai</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
