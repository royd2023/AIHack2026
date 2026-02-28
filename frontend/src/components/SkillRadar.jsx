import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-ibm-gray-90 border border-ibm-gray-70 rounded-lg px-4 py-3 shadow-xl">
        <p className="text-white font-semibold text-sm mb-2">{label}</p>
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-ibm-gray-30">{entry.name}:</span>
            <span className="text-white font-medium">{Math.round(entry.value)}%</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

const CustomAngleAxis = ({ payload, x, y, cx, cy, ...rest }) => {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-current"
      style={{ fill: '#c6c6c6', fontSize: '11px', fontFamily: 'IBM Plex Sans' }}
    >
      {payload.value}
    </text>
  )
}

export default function SkillRadar({ data }) {
  if (!data || data.length === 0) return null

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Skill Coverage Radar</h3>
          <p className="text-ibm-gray-50 text-sm mt-1">Your skills vs. career requirements</p>
        </div>
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-ibm-blue rounded" />
            <span className="text-ibm-gray-30">Career Target</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-4 h-0.5 rounded"
              style={{ background: '#ff8389', borderStyle: 'dashed' }}
            />
            <span className="text-ibm-gray-30">Your Current Level</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <RadarChart data={data} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
          <PolarGrid
            gridType="polygon"
            stroke="#393939"
            strokeWidth={1}
          />
          <PolarAngleAxis
            dataKey="category"
            tick={<CustomAngleAxis />}
            stroke="#525252"
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#525252', fontSize: 10 }}
            tickCount={5}
            stroke="transparent"
          />
          <Radar
            name="Career Target"
            dataKey="career_target"
            stroke="#4589ff"
            fill="#4589ff"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Radar
            name="Your Current Level"
            dataKey="student_current"
            stroke="#ff8389"
            fill="#ff8389"
            fillOpacity={0.1}
            strokeWidth={2}
            strokeDasharray="6 3"
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>

      {/* Coverage summary */}
      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-ibm-gray-80">
        {data.slice(0, 4).map(item => (
          <div key={item.category} className="flex items-center justify-between">
            <span className="text-ibm-gray-30 text-xs">{item.category}</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1 bg-ibm-gray-80 rounded-full">
                <div
                  className="h-full bg-ibm-blue rounded-full"
                  style={{ width: `${item.student_current}%` }}
                />
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
