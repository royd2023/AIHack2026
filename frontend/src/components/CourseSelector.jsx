import { useState, useMemo, useRef, useEffect } from 'react'

export default function CourseSelector({ courses, selected, onChange }) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return courses.filter(
      c =>
        c.number.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q)
    ).slice(0, 40)
  }, [courses, search])

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (courseId) => {
    if (selected.includes(courseId)) {
      onChange(selected.filter(id => id !== courseId))
    } else {
      onChange([...selected, courseId])
    }
  }

  const selectedCourses = courses.filter(c => selected.includes(c.id))

  return (
    <div ref={containerRef} className="relative">
      {/* Search input */}
      <div
        className="flex items-center gap-2 bg-ibm-gray-90 border border-ibm-gray-70 px-4 py-3 cursor-text transition-all duration-150 focus-within:border-ibm-blue"
        onClick={() => setIsOpen(true)}
      >
        <svg className="w-4 h-4 text-ibm-gray-50 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          className="flex-1 bg-transparent text-white placeholder-ibm-gray-50 text-sm outline-none"
          placeholder="Search by course number or title..."
          value={search}
          onChange={e => { setSearch(e.target.value); setIsOpen(true) }}
          onFocus={() => setIsOpen(true)}
        />
        {selected.length > 0 && (
          <span className="font-mono text-xs text-ibm-blue border border-ibm-blue/40 px-2 py-0.5 flex-shrink-0">
            [ {selected.length} ]
          </span>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-40 w-full mt-0 border border-ibm-gray-70 border-t-0 shadow-2xl max-h-72 overflow-y-auto" style={{ backgroundColor: '#1a1a1a' }}>
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-ibm-gray-50 text-sm">
              No courses matching "{search}"
            </div>
          ) : (
            filtered.map(course => {
              const isSel = selected.includes(course.id)
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => toggle(course.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-ibm-gray-80 transition-colors border-b border-ibm-gray-80 last:border-0 ${isSel ? 'bg-ibm-blue/5' : ''
                    }`}
                >
                  {/* Checkbox */}
                  <div className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center transition-colors ${isSel ? 'bg-ibm-blue border-ibm-blue' : 'border-ibm-gray-50'
                    }`}>
                    {isSel && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-ibm-blue text-xs font-mono font-medium">{course.number}</span>
                      <span className="text-white text-sm truncate">{course.title}</span>
                    </div>
                    <div className="text-ibm-gray-50 text-xs mt-0.5">
                      {course.credits} credits
                      {course.prerequisites?.length > 0 && (
                        <span className="ml-2">· Prereqs: {course.prerequisites.join(', ')}</span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}

      {/* Selected chips */}
      {selectedCourses.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedCourses.map(course => (
            <button
              key={course.id}
              type="button"
              onClick={() => toggle(course.id)}
              className="inline-flex items-center gap-1.5 bg-ibm-blue/10 border border-ibm-blue/30 text-ibm-blue px-2 py-1 text-xs font-mono hover:bg-ibm-red/10 hover:border-ibm-red/30 hover:text-ibm-red transition-colors group"
            >
              {course.number}
              <span className="opacity-50 group-hover:opacity-100 text-xs leading-none">×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
