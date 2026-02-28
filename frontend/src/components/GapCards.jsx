import { useState, useEffect } from 'react'

const CATEGORY_COLORS = {
  technical:   { bg: 'bg-ibm-blue/15',   text: 'text-ibm-blue',   border: 'border-ibm-blue/30' },
  tool:        { bg: 'bg-ibm-cyan/15',   text: 'text-ibm-cyan',   border: 'border-ibm-cyan/30' },
  framework:   { bg: 'bg-ibm-purple/15', text: 'text-ibm-purple', border: 'border-ibm-purple/30' },
  methodology: { bg: 'bg-ibm-teal/15',   text: 'text-ibm-teal',   border: 'border-ibm-teal/30' },
  soft_skill:  { bg: 'bg-ibm-green/15',  text: 'text-ibm-green',  border: 'border-ibm-green/30' },
}

function getGapColor(gapScore) {
  if (gapScore >= 0.7) return { bar: 'bg-ibm-red',    label: 'text-ibm-red',    badge: 'bg-ibm-red/10 text-ibm-red border-ibm-red/30',       urgency: 'Critical' }
  if (gapScore >= 0.4) return { bar: 'bg-ibm-yellow', label: 'text-ibm-yellow', badge: 'bg-ibm-yellow/10 text-ibm-yellow border-ibm-yellow/30', urgency: 'Important' }
  return                      { bar: 'bg-ibm-green',  label: 'text-ibm-green',  badge: 'bg-ibm-green/10 text-ibm-green border-ibm-green/30',   urgency: 'Nice to have' }
}

function GapCard({ gap, index }) {
  const [expanded, setExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const catStyle = CATEGORY_COLORS[gap.category] || CATEGORY_COLORS.technical
  const gapColor = getGapColor(gap.gap_score)
  const demandPct = Math.round(gap.demand_score * 100)
  const profPct   = Math.round(gap.student_proficiency * 100)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), index * 80 + 100)
    return () => clearTimeout(t)
  }, [index])

  return (
    <div
      className="border border-ibm-gray-80 p-5 hover:border-ibm-gray-70 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 animate-slide-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-mono font-bold capitalize text-sm mb-2">{gap.name}</h4>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-mono text-xs border px-1.5 py-0.5 ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
              {gap.category.replace('_', ' ')}
            </span>
            <span className={`font-mono text-xs border px-1.5 py-0.5 ${gapColor.badge}`}>
              {gapColor.urgency}
            </span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-ibm-gray-70 hover:text-white transition-colors flex-shrink-0 font-mono text-xs mt-0.5"
        >
          {expanded ? '−' : '+'}
        </button>
      </div>

      {/* Demand bar */}
      <div className="mb-3">
        <div className="flex justify-between font-mono text-xs mb-1.5">
          <span className="text-ibm-gray-50 uppercase tracking-wider">Market Demand</span>
          <span className={`font-medium ${gapColor.label}`}>{demandPct}%</span>
        </div>
        <div className="h-0.5 bg-ibm-gray-80 overflow-hidden">
          <div
            className={`h-full ${gapColor.bar} transition-all duration-1000`}
            style={{ width: mounted ? `${demandPct}%` : '0%' }}
          />
        </div>
      </div>

      {/* Your level */}
      <div className="mb-4">
        <div className="flex justify-between font-mono text-xs mb-1.5">
          <span className="text-ibm-gray-50 uppercase tracking-wider">Your Level</span>
          <span className="text-ibm-gray-30">{profPct}%</span>
        </div>
        <div className="h-0.5 bg-ibm-gray-80 overflow-hidden">
          <div
            className="h-full bg-ibm-blue/60 transition-all duration-1000"
            style={{ width: mounted ? `${profPct}%` : '0%' }}
          />
        </div>
      </div>

      {/* Courses that teach this */}
      {gap.taught_in && gap.taught_in.length > 0 && (
        <div className="mb-3">
          <span className="font-mono text-ibm-gray-50 text-xs uppercase tracking-wider mb-2 block">Taught in</span>
          <div className="flex flex-wrap gap-1">
            {gap.taught_in.map(course => (
              <span key={course} className="font-mono text-xs bg-ibm-gray-80 text-ibm-gray-30 border border-ibm-gray-70 px-1.5 py-0.5">
                {course}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-ibm-gray-80 space-y-3 animate-fade-in">
          {gap.sample_companies && gap.sample_companies.length > 0 && (
            <div>
              <span className="font-mono text-ibm-gray-50 text-xs uppercase tracking-wider block mb-2">Companies hiring</span>
              <div className="flex flex-wrap gap-1">
                {gap.sample_companies.map(company => (
                  <span key={company} className="font-mono text-xs bg-ibm-blue/10 text-ibm-blue border border-ibm-blue/20 px-1.5 py-0.5">
                    {company}
                  </span>
                ))}
              </div>
            </div>
          )}
          {gap.co_occurring_skills && gap.co_occurring_skills.length > 0 && (
            <div>
              <span className="font-mono text-ibm-gray-50 text-xs uppercase tracking-wider block mb-2">Often paired with</span>
              <div className="flex flex-wrap gap-1">
                {gap.co_occurring_skills.map(skill => (
                  <span key={skill} className="font-mono text-xs bg-ibm-gray-80 text-ibm-gray-30 border border-ibm-gray-70 px-1.5 py-0.5 capitalize">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between font-mono text-xs pt-1">
            <span className="text-ibm-gray-50 uppercase tracking-wider">Gap Score</span>
            <span className={`font-semibold ${gapColor.label}`}>{(gap.gap_score * 100).toFixed(1)} pts</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function GapCards({ gaps }) {
  if (!gaps || gaps.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ibm-gray-50 mb-1">Skill Gaps</p>
          <p className="font-mono text-xs text-ibm-gray-70">Ranked by market value × your current level</p>
        </div>
        <span className="font-mono text-xs text-ibm-red border border-ibm-red/30 px-2 py-0.5">
          {gaps.length} gaps
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-0 border border-ibm-gray-80">
        {gaps.slice(0, 6).map((gap, i) => (
          <div key={gap.name} className="border-r border-b border-ibm-gray-80 last:border-r-0 [&:nth-child(2)]:border-r-0 xl:[&:nth-child(2)]:border-r xl:[&:nth-child(3)]:border-r-0 sm:[&:nth-child(even)]:border-r-0 xl:[&:nth-child(even)]:border-r">
            <GapCard gap={gap} index={i} />
          </div>
        ))}
      </div>
    </div>
  )
}
