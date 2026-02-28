import { useState } from 'react'

export default function HowItWorks({ stats }) {
  const [open, setOpen] = useState(false)

  const postings    = stats?.job_postings_analyzed ?? '—'
  const courses     = stats?.courses_fingerprinted ?? '—'
  const dataSources = stats?.data_sources ?? 'LinkedIn, Indeed (job postings); syllabi.engineering.osu.edu (course data)'

  const cards = [
    {
      color: 'text-ibm-blue',
      borderColor: 'border-ibm-blue/20',
      accentBar: 'bg-ibm-blue',
      title: 'Real Market Intelligence',
      step: '01',
      body: `Analyzed ${postings} real job postings from JPMorgan, Amazon, Google using IBM Granite to build a live skill demand index.`,
      detail: `Data: ${dataSources}`,
    },
    {
      color: 'text-ibm-cyan',
      borderColor: 'border-ibm-cyan/20',
      accentBar: 'bg-ibm-cyan',
      title: 'Course DNA Fingerprinting',
      step: '02',
      body: `Used IBM Granite to extract skill fingerprints from ${courses} OSU courses via official syllabi, with Granite Embeddings to detect redundancy.`,
      detail: 'Source: syllabi.engineering.osu.edu',
    },
    {
      color: 'text-ibm-purple',
      borderColor: 'border-ibm-purple/20',
      accentBar: 'bg-ibm-purple',
      title: 'Multi-Objective Optimization',
      step: '03',
      body: 'IBM Granite runs multi-objective optimization generating 3 Pareto-optimal plans balancing career alignment, prerequisites, and workload.',
      detail: 'Gap score = demand_score × (1 − student_proficiency)',
    },
  ]

  return (
    <div className="border border-ibm-gray-80">
      <button
        className="w-full flex items-center justify-between px-6 py-5 hover:bg-ibm-gray-80/40 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="text-left">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ibm-gray-50 mb-1">How Our AI Works</p>
          <p className="font-mono text-xs text-ibm-gray-70">3-stage IBM Granite pipeline — click to expand</p>
        </div>
        <span className={`font-mono text-ibm-gray-50 text-sm transition-transform inline-block ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="border-t border-ibm-gray-80 animate-fade-in">
          {/* Stage cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-ibm-gray-80">
            {cards.map((card) => (
              <div key={card.step} className="p-6 relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-0.5 ${card.accentBar}`} />
                <span className={`font-mono text-xs ${card.color} block mb-3`}>{card.step}</span>
                <h4 className={`font-mono font-bold uppercase text-xs ${card.color} mb-3`}>{card.title}</h4>
                <p className="text-ibm-gray-30 text-xs leading-relaxed mb-3">{card.body}</p>
                <p className="font-mono text-ibm-gray-50 text-xs">{card.detail}</p>
              </div>
            ))}
          </div>

          {/* Pipeline diagram */}
          <div className="border-t border-ibm-gray-80 px-6 py-5">
            <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
              <span className="bg-ibm-blue/10 border border-ibm-blue/20 text-ibm-blue px-2 py-1">job_postings.json</span>
              <span className="text-ibm-gray-70">→</span>
              <span className="bg-ibm-gray-80 border border-ibm-gray-70 text-ibm-gray-30 px-2 py-1">Granite skill_extractor</span>
              <span className="text-ibm-gray-70">→</span>
              <span className="bg-ibm-blue/10 border border-ibm-blue/20 text-ibm-blue px-2 py-1">skill_index.json</span>
              <span className="text-ibm-gray-70">→</span>
              <span className="bg-ibm-cyan/10 border border-ibm-cyan/20 text-ibm-cyan px-2 py-1">osu_courses.json</span>
              <span className="text-ibm-gray-70">→</span>
              <span className="bg-ibm-gray-80 border border-ibm-gray-70 text-ibm-gray-30 px-2 py-1">Granite + Embeddings</span>
              <span className="text-ibm-gray-70">→</span>
              <span className="bg-ibm-purple/10 border border-ibm-purple/20 text-ibm-purple px-2 py-1">3 optimized plans</span>
            </div>
          </div>

          <div className="border-t border-ibm-gray-80 px-6 py-4">
            <p className="font-mono text-ibm-gray-70 text-xs text-center">
              Powered by{' '}
              <span className="text-ibm-blue">ibm/granite-4-h-small</span>
              {' '}and{' '}
              <span className="text-ibm-cyan">ibm/granite-embedding-278m-multilingual</span>
              {' '}on{' '}
              <span className="text-white">IBM watsonx.ai</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
