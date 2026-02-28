import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-ibm-gray-90 border border-ibm-gray-70 px-4 py-3 shadow-xl font-mono">
        <p className="text-white font-bold text-xs uppercase tracking-wider mb-2">{label}</p>
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-3 text-xs">
            <span className="inline-block w-3 h-px" style={{ backgroundColor: entry.color }} />
            <span className="text-ibm-gray-30">{entry.name}:</span>
            <span className="text-white">{Math.round(entry.value)}%</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

const CustomAngleAxis = ({ payload, x, y }) => {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fill: '#8d8d8d', fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}
    >
      {payload.value}
    </text>
  )
}

export default function SkillRadar({ data }) {
  if (!data || data.length === 0) return null

  return (
    <div className="border border-ibm-gray-80 p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ibm-gray-50 mb-1">Skill Coverage Radar</p>
          <p className="font-mono text-xs text-ibm-gray-70">Your skills vs. career requirements</p>
        </div>
        <div className="flex flex-col gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-px bg-ibm-blue" />
            <span className="text-ibm-gray-50">Career Target</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4" style={{ height: '1px', background: '#ff8389', borderTop: '1px dashed #ff8389' }} />
            <span className="text-ibm-gray-50">Your Level</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
          <PolarGrid gridType="polygon" stroke="#393939" strokeWidth={1} />
          <PolarAngleAxis dataKey="category" tick={<CustomAngleAxis />} stroke="#525252" />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#525252', fontSize: 9, fontFamily: 'IBM Plex Mono' }}
            tickCount={5}
            stroke="transparent"
          />
          <Radar
            name="Career Target"
            dataKey="career_target"
            stroke="#4589ff"
            fill="#4589ff"
            fillOpacity={0.12}
            strokeWidth={2}
          />
          <Radar
            name="Your Level"
            dataKey="student_current"
            stroke="#ff8389"
            fill="#ff8389"
            fillOpacity={0.08}
            strokeWidth={2}
            strokeDasharray="6 3"
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>

      {/* Coverage mini-bars */}
      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-ibm-gray-80">
        {data.slice(0, 4).map(item => (
          <div key={item.category} className="flex items-center justify-between gap-3">
            <span className="text-ibm-gray-50 text-xs font-mono truncate">{item.category}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-14 h-0.5 bg-ibm-gray-80 overflow-hidden">
                <div className="h-full bg-ibm-blue" style={{ width: `${item.student_current}%` }} />
              </div>
              <span className="text-white text-xs font-mono w-8 text-right">
                {Math.round(item.student_current)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
