import { useState } from 'react'

const PLAN_STYLES = [
  {
    border: 'border-ibm-green/40',
    glow: 'hover:shadow-ibm-green/10',
    accent: 'text-ibm-green',
    bg: 'bg-ibm-green/5',
    ring: 'bg-ibm-green',
    ringBg: 'bg-ibm-green/10',
    badge: 'bg-ibm-green/15 text-ibm-green border-ibm-green/30',
    icon: '🚀',
    defaultLabel: 'Fastest to Job-Ready',
  },
  {
    border: 'border-ibm-blue/40',
    glow: 'hover:shadow-ibm-blue/10',
    accent: 'text-ibm-blue',
    bg: 'bg-ibm-blue/5',
    ring: 'bg-ibm-blue',
    ringBg: 'bg-ibm-blue/10',
    badge: 'bg-ibm-blue/15 text-ibm-blue border-ibm-blue/30',
    icon: '🔀',
    defaultLabel: 'Maximum Optionality',
  },
  {
    border: 'border-ibm-purple/40',
    glow: 'hover:shadow-ibm-purple/10',
    accent: 'text-ibm-purple',
    bg: 'bg-ibm-purple/5',
    ring: 'bg-ibm-purple',
    ringBg: 'bg-ibm-purple/10',
    badge: 'bg-ibm-purple/15 text-ibm-purple border-ibm-purple/30',
    icon: '⚖️',
    defaultLabel: 'Balanced Growth',
  },
]

function CircleProgress({ pct, style }) {
  const r = 30
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="80" height="80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} stroke="#393939" strokeWidth="6" fill="none" />
        <circle
          cx="40" cy="40" r={r}
          stroke="currentColor"
          className={style.accent}
          strokeWidth="6"
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-lg font-bold font-mono ${style.accent}`}>{pct}%</span>
      </div>
    </div>
  )
}

function SemesterRow({ semester, style }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-ibm-gray-80 rounded-lg overflow-hidden">
      <button
        className={`w-full flex items-center justify-between px-4 py-3 text-left hover:${style.bg} transition-colors`}
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <span className="text-ibm-gray-50 text-xs font-mono w-20">{semester.semester}</span>
          <div className="flex gap-1 flex-wrap">
            {semester.courses?.slice(0, 3).map(c => (
              <span key={c.number} className={`chip text-xs border ${style.badge}`}>
                {c.number}
              </span>
            ))}
            {semester.courses?.length > 3 && (
              <span className="chip bg-ibm-gray-80 text-ibm-gray-50 text-xs">
                +{semester.courses.length - 3}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          {semester.total_credits && (
            <span className="text-ibm-gray-50 text-xs font-mono">{semester.total_credits} cr</span>
          )}
          <svg className={`w-4 h-4 text-ibm-gray-50 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-ibm-gray-80 pt-3 animate-fade-in">
          <div className="space-y-2">
            {semester.courses?.map(c => (
              <div key={c.number} className="flex items-center gap-3">
                <span className={`font-mono text-xs font-medium ${style.accent}`}>{c.number}</span>
                <span className="text-ibm-gray-30 text-sm">{c.title}</span>
                {c.credits && (
                  <span className="ml-auto text-ibm-gray-50 text-xs">{c.credits} cr</span>
                )}
              </div>
            ))}
          </div>
          {semester.rationale && (
            <p className="text-ibm-gray-50 text-xs italic mt-3 pt-3 border-t border-ibm-gray-80">
              {semester.rationale}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function PlanCard({ plan, style, index }) {
  const coverage = plan.projected_skill_coverage ?? 0
  const icon = plan.icon || style.icon
  const name = plan.plan_name || style.defaultLabel

  return (
    <div
      className={`glass-card rounded-2xl p-6 border-2 ${style.border} hover:shadow-2xl transition-all duration-300 flex flex-col animate-slide-up`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{icon}</span>
            <h3 className={`font-semibold text-base ${style.accent}`}>{name}</h3>
          </div>
          {plan.strategy && (
            <p className="text-ibm-gray-30 text-xs italic leading-relaxed">{plan.strategy}</p>
          )}
        </div>
      </div>

      {/* Metrics row */}
      <div className="flex items-center gap-4 mb-5 pb-5 border-b border-ibm-gray-80">
        <CircleProgress pct={coverage} style={style} />
        <div className="flex flex-col gap-2">
          <div>
            <div className="text-ibm-gray-50 text-xs mb-0.5">Skill Coverage</div>
            <div className={`text-xl font-bold font-mono ${style.accent}`}>{coverage}%</div>
          </div>
          {plan.estimated_semesters_remaining && (
            <span className={`chip border text-xs w-fit ${style.badge}`}>
              {plan.estimated_semesters_remaining} sem remaining
            </span>
          )}
        </div>
      </div>

      {/* Top skills */}
      {plan.top_skills_gained && plan.top_skills_gained.length > 0 && (
        <div className="mb-5">
          <div className="text-ibm-gray-50 text-xs mb-2">Skills you'll gain:</div>
          <div className="flex flex-wrap gap-1.5">
            {plan.top_skills_gained.map(skill => (
              <span key={skill} className={`chip border text-xs ${style.badge}`}>{skill}</span>
            ))}
          </div>
        </div>
      )}

      {/* Semesters */}
      {plan.semesters && plan.semesters.length > 0 && (
        <div className="flex-1">
          <div className="text-ibm-gray-50 text-xs mb-2">Semester plan:</div>
          <div className="space-y-2">
            {plan.semesters.map((sem, i) => (
              <SemesterRow key={`${sem.semester}-${i}`} semester={sem} style={style} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PlanCards({ plans }) {
  if (!plans || plans.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <p className="text-ibm-gray-50">No plans generated — check that pipeline has been run.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Your Optimized Course Plans</h3>
          <p className="text-ibm-gray-50 text-sm mt-1">
            3 Pareto-optimal paths generated by IBM Granite
          </p>
        </div>
        <div className="chip bg-ibm-blue/10 text-ibm-blue border border-ibm-blue/30 text-xs font-mono">
          ibm/granite-4-h-small
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {plans.slice(0, 3).map((plan, i) => (
          <PlanCard
            key={plan.plan_name || i}
            plan={plan}
            style={PLAN_STYLES[i % PLAN_STYLES.length]}
            index={i}
          />
        ))}
      </div>
    </div>
  )
}
