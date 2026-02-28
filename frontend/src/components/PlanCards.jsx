import { useState } from 'react'

const PLAN_STYLES = [
  {
    accentBar: 'bg-ibm-green',
    accent: 'text-ibm-green',
    border: 'border-ibm-green/30',
    bg: 'bg-ibm-green/5',
    badge: 'bg-ibm-green/10 text-ibm-green border-ibm-green/30',
    icon: '🚀',
    defaultLabel: 'Fastest to Job-Ready',
    index: '01',
  },
  {
    accentBar: 'bg-ibm-blue',
    accent: 'text-ibm-blue',
    border: 'border-ibm-blue/30',
    bg: 'bg-ibm-blue/5',
    badge: 'bg-ibm-blue/10 text-ibm-blue border-ibm-blue/30',
    icon: '🔀',
    defaultLabel: 'Maximum Optionality',
    index: '02',
  },
  {
    accentBar: 'bg-ibm-purple',
    accent: 'text-ibm-purple',
    border: 'border-ibm-purple/30',
    bg: 'bg-ibm-purple/5',
    badge: 'bg-ibm-purple/10 text-ibm-purple border-ibm-purple/30',
    icon: '⚖️',
    defaultLabel: 'Balanced Growth',
    index: '03',
  },
]

function CircleProgress({ pct, style }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0">
      <svg width="72" height="72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} stroke="#393939" strokeWidth="4" fill="none" />
        <circle
          cx="36" cy="36" r={r}
          stroke="currentColor"
          className={style.accent}
          strokeWidth="4"
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="square"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-base font-bold font-mono ${style.accent}`}>{pct}%</span>
      </div>
    </div>
  )
}

function SemesterRow({ semester, style }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-ibm-gray-80">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-ibm-gray-80/60 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-ibm-gray-50 text-xs w-20">{semester.semester}</span>
          <div className="flex gap-1 flex-wrap">
            {semester.courses?.slice(0, 3).map(c => (
              <span key={c.number} className={`font-mono text-xs border px-1.5 py-0.5 ${style.badge}`}>
                {c.number}
              </span>
            ))}
            {semester.courses?.length > 3 && (
              <span className="font-mono text-xs bg-ibm-gray-80 text-ibm-gray-50 px-1.5 py-0.5 border border-ibm-gray-70">
                +{semester.courses.length - 3}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          {semester.total_credits && (
            <span className="font-mono text-ibm-gray-50 text-xs">{semester.total_credits} cr</span>
          )}
          <span className={`font-mono text-xs text-ibm-gray-50 transition-transform inline-block ${open ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-ibm-gray-80 pt-3 animate-fade-in">
          <div className="space-y-2">
            {semester.courses?.map(c => (
              <div key={c.number} className="flex items-center gap-3">
                <span className={`font-mono text-xs font-medium ${style.accent}`}>{c.number}</span>
                <span className="text-ibm-gray-30 text-sm flex-1">{c.title}</span>
                {c.credits && (
                  <span className="font-mono text-ibm-gray-50 text-xs">{c.credits} cr</span>
                )}
              </div>
            ))}
          </div>
          {semester.rationale && (
            <p className="font-mono text-ibm-gray-50 text-xs italic mt-3 pt-3 border-t border-ibm-gray-80">
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
  const name = plan.plan_name || style.defaultLabel

  return (
    <div
      className={`border border-ibm-gray-80 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col animate-slide-up overflow-hidden`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Colored top accent bar */}
      <div className={`h-0.5 w-full ${style.accentBar}`} />

      <div className="p-6 flex flex-col flex-1">
        {/* Header */}
        <div className="mb-5">
          <span className={`font-mono text-xs ${style.accent} block mb-2`}>{style.index}</span>
          <h3 className={`font-mono font-bold uppercase text-sm leading-snug ${style.accent}`}>{name}</h3>
          {plan.strategy && (
            <p className="text-ibm-gray-50 text-xs leading-relaxed mt-2">{plan.strategy}</p>
          )}
        </div>

        {/* Metrics row */}
        <div className="flex items-center gap-5 mb-5 pb-5 border-b border-ibm-gray-80">
          <CircleProgress pct={coverage} style={style} />
          <div className="flex flex-col gap-2">
            <div>
              <div className="font-mono text-ibm-gray-50 text-xs uppercase tracking-wider mb-0.5">Coverage</div>
              <div className={`text-2xl font-bold font-mono ${style.accent}`}>{coverage}%</div>
            </div>
            {plan.estimated_semesters_remaining && (
              <span className={`font-mono border text-xs px-1.5 py-0.5 w-fit ${style.badge}`}>
                {plan.estimated_semesters_remaining} sem left
              </span>
            )}
          </div>
        </div>

        {/* Skills gained */}
        {plan.top_skills_gained && plan.top_skills_gained.length > 0 && (
          <div className="mb-5">
            <div className="font-mono text-ibm-gray-50 text-xs uppercase tracking-wider mb-2">Skills you'll gain</div>
            <div className="flex flex-wrap gap-1">
              {plan.top_skills_gained.map(skill => (
                <span key={skill} className={`font-mono border text-xs px-1.5 py-0.5 ${style.badge}`}>{skill}</span>
              ))}
            </div>
          </div>
        )}

        {/* Semesters */}
        {plan.semesters && plan.semesters.length > 0 && (
          <div className="flex-1">
            <div className="font-mono text-ibm-gray-50 text-xs uppercase tracking-wider mb-2">Semester plan</div>
            <div className="space-y-1">
              {plan.semesters.map((sem, i) => (
                <SemesterRow key={`${sem.semester}-${i}`} semester={sem} style={style} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PlanCards({ plans, wasRefined, refinementSummary }) {
  if (!plans || plans.length === 0) {
    return (
      <div className="border border-ibm-gray-80 p-8 text-center">
        <p className="font-mono text-ibm-gray-50 text-xs uppercase tracking-wider">No plans generated — check that pipeline has been run.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ibm-gray-50 mb-1">Course Plans</p>
          <p className="font-mono text-xs text-ibm-gray-70">3 Pareto-optimal paths · IBM Granite</p>
        </div>
        <span className="font-mono text-xs text-ibm-blue border border-ibm-blue/30 px-2 py-0.5">
          [ ibm/granite-4-h-small ]
        </span>
      </div>

      {/* AI self-review banner */}
      {wasRefined ? (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 border border-ibm-blue/30 bg-ibm-blue/5">
          <span className="text-sm flex-shrink-0">🔄</span>
          <div>
            <span className="font-mono text-xs text-ibm-blue font-bold uppercase tracking-wider">AI detected issues and auto-corrected</span>
            {refinementSummary && (
              <p className="font-mono text-xs text-ibm-gray-50 mt-0.5">{refinementSummary}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 border border-ibm-green/20 bg-ibm-green/5">
          <span className="text-sm">✅</span>
          <span className="font-mono text-xs text-ibm-green">Plans verified by AI self-review — prerequisite order confirmed, workload balanced</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-ibm-gray-80">
        {plans.slice(0, 3).map((plan, i) => (
          <div key={plan.plan_name || i} className="border-r border-ibm-gray-80 last:border-r-0">
            <PlanCard
              plan={plan}
              style={PLAN_STYLES[i % PLAN_STYLES.length]}
              index={i}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
