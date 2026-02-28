import { useState } from 'react'

const CATEGORY_COLORS = {
  technical: { bg: 'bg-ibm-blue/15', text: 'text-ibm-blue', border: 'border-ibm-blue/30' },
  tool: { bg: 'bg-ibm-cyan/15', text: 'text-ibm-cyan', border: 'border-ibm-cyan/30' },
  framework: { bg: 'bg-ibm-purple/15', text: 'text-ibm-purple', border: 'border-ibm-purple/30' },
  methodology: { bg: 'bg-ibm-teal/15', text: 'text-ibm-teal', border: 'border-ibm-teal/30' },
  soft_skill: { bg: 'bg-ibm-green/15', text: 'text-ibm-green', border: 'border-ibm-green/30' },
}

function getGapColor(gapScore) {
  if (gapScore >= 0.7) return { bar: 'bg-ibm-red', label: 'text-ibm-red', badge: 'bg-ibm-red/10 text-ibm-red border-ibm-red/30', urgency: 'Critical' }
  if (gapScore >= 0.4) return { bar: 'bg-ibm-yellow', label: 'text-ibm-yellow', badge: 'bg-ibm-yellow/10 text-ibm-yellow border-ibm-yellow/30', urgency: 'Important' }
  return { bar: 'bg-ibm-green', label: 'text-ibm-green', badge: 'bg-ibm-green/10 text-ibm-green border-ibm-green/30', urgency: 'Nice to have' }
}

function GapCard({ gap, index }) {
  const [expanded, setExpanded] = useState(false)
  const catStyle = CATEGORY_COLORS[gap.category] || CATEGORY_COLORS.technical
  const gapColor = getGapColor(gap.gap_score)
  const demandPct = Math.round(gap.demand_score * 100)
  const profPct = Math.round(gap.student_proficiency * 100)

  return (
    <div className="glass-card rounded-xl p-5 hover:border-ibm-gray-70 transition-all duration-200 animate-slide-up" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-white font-semibold capitalize">{gap.name}</h4>
            <span className={`chip border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
              {gap.category.replace('_', ' ')}
            </span>
            <span className={`chip border text-xs ${gapColor.badge}`}>
              {gapColor.urgency}
            </span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-ibm-gray-50 hover:text-white transition-colors flex-shrink-0 mt-1"
        >
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Demand bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-ibm-gray-50">Market Demand</span>
          <span className={`font-mono font-medium ${gapColor.label}`}>{demandPct}%</span>
        </div>
        <div className="h-2 bg-ibm-gray-80 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${gapColor.bar} transition-all duration-1000`}
            style={{ width: `${demandPct}%` }}
          />
        </div>
      </div>

      {/* Your level */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-ibm-gray-50">Your Level</span>
          <span className="text-ibm-gray-30 font-mono">{profPct}%</span>
        </div>
        <div className="h-2 bg-ibm-gray-80 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-ibm-blue/60 transition-all duration-1000"
            style={{ width: `${profPct}%` }}
          />
        </div>
      </div>

      {/* Courses that teach this */}
      {gap.taught_in && gap.taught_in.length > 0 && (
        <div className="mb-3">
          <span className="text-ibm-gray-50 text-xs mb-2 block">Taught in:</span>
          <div className="flex flex-wrap gap-1.5">
            {gap.taught_in.map(course => (
              <span key={course} className="chip bg-ibm-gray-80 text-ibm-gray-30 border border-ibm-gray-70 font-mono text-xs">
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
              <span className="text-ibm-gray-50 text-xs block mb-2">Companies hiring for this:</span>
              <div className="flex flex-wrap gap-1.5">
                {gap.sample_companies.map(company => (
                  <span key={company} className="chip bg-ibm-blue/10 text-ibm-blue border border-ibm-blue/20 text-xs">
                    {company}
                  </span>
                ))}
              </div>
            </div>
          )}
          {gap.co_occurring_skills && gap.co_occurring_skills.length > 0 && (
            <div>
              <span className="text-ibm-gray-50 text-xs block mb-2">Often paired with:</span>
              <div className="flex flex-wrap gap-1.5">
                {gap.co_occurring_skills.map(skill => (
                  <span key={skill} className="chip bg-ibm-gray-80 text-ibm-gray-30 border border-ibm-gray-70 text-xs capitalize">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-ibm-gray-50">Gap Score</span>
            <span className={`font-mono font-semibold ${gapColor.label}`}>
              {(gap.gap_score * 100).toFixed(1)} pts
            </span>
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Top Skill Gaps</h3>
          <p className="text-ibm-gray-50 text-sm mt-1">
            Ranked by market value × your current level
          </p>
        </div>
        <span className="chip bg-ibm-red/10 text-ibm-red border border-ibm-red/20">
          {gaps.length} gaps found
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {gaps.slice(0, 6).map((gap, i) => (
          <GapCard key={gap.name} gap={gap} index={i} />
        ))}
      </div>
    </div>
  )
}
