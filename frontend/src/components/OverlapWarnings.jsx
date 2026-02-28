export default function OverlapWarnings({ overlaps }) {
  if (!overlaps || overlaps.length === 0) return null

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-ibm-yellow/15 border border-ibm-yellow/30 flex items-center justify-center text-base">
          ⚠️
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">Course Overlap Warnings</h3>
          <p className="text-ibm-gray-50 text-xs mt-0.5">
            Detected via Granite Embeddings semantic similarity
          </p>
        </div>
        <span className="ml-auto chip bg-ibm-yellow/10 text-ibm-yellow border border-ibm-yellow/30 text-xs">
          {overlaps.length} detected
        </span>
      </div>

      <div className="space-y-3">
        {overlaps.map((pair, i) => (
          <div
            key={i}
            className="flex items-start gap-4 p-4 bg-ibm-yellow/5 border border-ibm-yellow/20 rounded-xl"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="font-mono text-xs font-semibold text-ibm-blue">{pair.course_a}</span>
                <span className="text-ibm-gray-50 text-xs">{pair.title_a}</span>
                <svg className="w-4 h-4 text-ibm-yellow flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 01.894.553l7 14a1 1 0 01-.894 1.447H3a1 1 0 01-.894-1.447l7-14A1 1 0 0110 3zm0 2.236L4.236 17h11.528L10 5.236z" clipRule="evenodd" />
                </svg>
                <span className="font-mono text-xs font-semibold text-ibm-blue">{pair.course_b}</span>
                <span className="text-ibm-gray-50 text-xs">{pair.title_b}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 bg-ibm-gray-80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ibm-yellow rounded-full"
                      style={{ width: `${Math.round(pair.similarity * 100)}%` }}
                    />
                  </div>
                  <span className="text-ibm-yellow text-xs font-mono font-semibold">
                    {Math.round(pair.similarity * 100)}% overlap
                  </span>
                </div>
                {pair.overlapping_skills && pair.overlapping_skills.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {pair.overlapping_skills.slice(0, 3).map(s => (
                      <span key={s} className="chip bg-ibm-gray-80 text-ibm-gray-30 border border-ibm-gray-70 text-xs">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-ibm-gray-50 text-xs mt-2">
                These courses have significant skill overlap — consider diversifying your elective choices.
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
