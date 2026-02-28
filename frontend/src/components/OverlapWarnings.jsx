export default function OverlapWarnings({ overlaps }) {
  if (!overlaps || overlaps.length === 0) return null

  return (
    <div className="border border-ibm-yellow/30">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-ibm-yellow/20 bg-ibm-yellow/5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-ibm-yellow text-xs">⚠</span>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-ibm-yellow">Course Overlap Warnings</p>
            <p className="font-mono text-xs text-ibm-gray-50 mt-0.5">Detected via Granite Embeddings semantic similarity</p>
          </div>
        </div>
        <span className="font-mono text-xs text-ibm-yellow border border-ibm-yellow/30 px-2 py-0.5">
          {overlaps.length} detected
        </span>
      </div>

      <div className="divide-y divide-ibm-yellow/10">
        {overlaps.map((pair, i) => (
          <div key={i} className="px-6 py-5">
            <div className="flex items-start gap-4 flex-wrap mb-3">
              <span className="font-mono text-xs font-semibold text-ibm-blue">{pair.course_a}</span>
              <span className="font-mono text-xs text-ibm-gray-50">{pair.title_a}</span>
              <span className="font-mono text-xs text-ibm-yellow">↔</span>
              <span className="font-mono text-xs font-semibold text-ibm-blue">{pair.course_b}</span>
              <span className="font-mono text-xs text-ibm-gray-50">{pair.title_b}</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="h-0.5 w-24 bg-ibm-gray-80 overflow-hidden">
                  <div
                    className="h-full bg-ibm-yellow"
                    style={{ width: `${Math.round(pair.similarity * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-ibm-yellow text-xs">{Math.round(pair.similarity * 100)}% overlap</span>
              </div>
              {pair.overlapping_skills && pair.overlapping_skills.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {pair.overlapping_skills.slice(0, 3).map(s => (
                    <span key={s} className="font-mono text-xs bg-ibm-gray-80 text-ibm-gray-30 border border-ibm-gray-70 px-1.5 py-0.5">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className="font-mono text-ibm-gray-50 text-xs mt-3">
              High skill overlap — consider diversifying your elective choices.
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
