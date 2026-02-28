import { useState, useEffect } from 'react'

export default function SkillRadar({ data }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 120)
    return () => clearTimeout(t)
  }, [])

  if (!data || data.length === 0) return null

  return (
    <div className="border border-ibm-gray-80 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ibm-gray-50 mb-1">Skill Coverage</p>
          <p className="font-mono text-xs text-ibm-gray-70">Your skills vs. career requirements</p>
        </div>
        <div className="flex flex-col gap-2 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-0.5 bg-ibm-blue" />
            <span className="text-ibm-gray-50">Career Target</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-0.5 bg-ibm-red opacity-70" />
            <span className="text-ibm-gray-50">Your Level</span>
          </div>
        </div>
      </div>

      {/* Comparison rows — one per skill */}
      <div className="space-y-6">
        {data.map((item, i) => {
          const target  = Math.round(item.career_target)
          const current = Math.round(item.student_current)
          const gap     = target - current

          return (
            <div key={item.category}>
              {/* Row header */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-ibm-gray-30 uppercase tracking-wider">
                  {item.category}
                </span>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-ibm-blue">{target}%</span>
                  <span className="text-ibm-gray-70">/</span>
                  <span className="text-ibm-red opacity-80">{current}%</span>
                  <span className={`ml-1 px-1.5 py-0.5 border text-xs ${
                    gap > 30
                      ? 'border-ibm-red/30 text-ibm-red bg-ibm-red/5'
                      : gap > 10
                        ? 'border-ibm-yellow/30 text-ibm-yellow bg-ibm-yellow/5'
                        : 'border-ibm-green/30 text-ibm-green bg-ibm-green/5'
                  }`}>
                    {gap > 0 ? `−${gap}` : `+${Math.abs(gap)}`}
                  </span>
                </div>
              </div>

              {/* Career target track */}
              <div className="h-1 bg-ibm-gray-80 overflow-hidden mb-1">
                <div
                  className="h-full bg-ibm-blue transition-all duration-1000"
                  style={{
                    width: mounted ? `${target}%` : '0%',
                    transitionDelay: `${i * 80}ms`,
                  }}
                />
              </div>

              {/* Your level track */}
              <div className="h-1 bg-ibm-gray-80 overflow-hidden">
                <div
                  className="h-full bg-ibm-red transition-all duration-1000"
                  style={{
                    width: mounted ? `${current}%` : '0%',
                    transitionDelay: `${i * 80 + 120}ms`,
                    opacity: 0.75,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary footer */}
      <div className="mt-7 pt-5 border-t border-ibm-gray-80 flex items-center justify-between">
        <span className="font-mono text-xs text-ibm-gray-50 uppercase tracking-wider">
          Avg. gap
        </span>
        <span className="font-mono text-xs text-white">
          {Math.round(
            data.reduce((acc, d) => acc + (d.career_target - d.student_current), 0) / data.length
          )}% below target
        </span>
      </div>
    </div>
  )
}
