import { useState, useEffect, useRef } from 'react'
import { fetchCourses, fetchCareers, analyzeStudent } from './utils/api'
import LoadingOverlay from './components/LoadingOverlay'
import CourseSelector from './components/CourseSelector'
import SkillRadar from './components/SkillRadar'
import GapCards from './components/GapCards'
import PlanCards from './components/PlanCards'
import OverlapWarnings from './components/OverlapWarnings'
import HowItWorks from './components/HowItWorks'

const IBM_LOGO = (
  <svg viewBox="0 0 48 19" fill="none" className="h-5">
    <rect width="48" height="19" rx="2" fill="#4589ff" opacity="0.15" />
    <text x="6" y="14" fill="#4589ff" fontSize="13" fontWeight="700" fontFamily="IBM Plex Sans, sans-serif">IBM</text>
  </svg>
)

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-30 border-b border-ibm-gray-80 bg-ibm-gray-100/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
        <span className="font-mono font-bold text-white text-sm tracking-tight">BuckeyePathfinder</span>
        <div className="flex items-center gap-4">
          <span className="hidden md:block font-mono text-xs text-ibm-gray-50">
            IBM AI Skills Builder · OSU
          </span>
          <span className="font-mono text-xs text-ibm-blue border border-ibm-blue/40 px-2 py-0.5 hidden sm:inline-block">
            [ ibm/granite-4-h-small ]
          </span>
          <span className="sm:hidden font-mono text-xs text-ibm-blue">[ IBM ]</span>
        </div>
      </div>
    </nav>
  )
}

function Hero({ onStart }) {
  return (
    <section className="relative pt-12 min-h-screen flex flex-col items-center justify-center overflow-hidden bg-ibm-gray-100">
      {/* Grain texture */}
      <div className="noise-overlay absolute inset-0 pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 text-center">

        {/* Eyebrow */}
        <p className="font-mono text-xs text-ibm-gray-50 uppercase tracking-[0.22em] mb-10 animate-fade-in">
          IBM AI Skills Builder · The Ohio State University
        </p>

        {/* Top rule — draws in from center */}
        <div className="h-px bg-ibm-blue animate-rule-draw mb-8" style={{ animationDelay: '80ms' }} />

        {/* Headline — two-line, huge mono */}
        <div className="overflow-hidden">
          <h1
            className="font-mono font-bold uppercase text-white leading-[0.88] tracking-tight"
            style={{ fontSize: 'clamp(52px, 14vw, 100px)' }}
          >
            <span className="block animate-slide-up" style={{ animationDelay: '180ms' }}>Buckeye</span>
            <span className="block animate-slide-up" style={{ animationDelay: '280ms' }}>Pathfinder</span>
          </h1>
        </div>

        {/* Bottom rule */}
        <div className="h-px bg-ibm-blue animate-rule-draw mt-8 mb-10" style={{ animationDelay: '420ms' }} />

        {/* Body copy */}
        <div className="animate-slide-up" style={{ animationDelay: '520ms' }}>
          <p className="text-ibm-gray-30 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto">
            AI-powered academic planning aligned with your career
          </p>
          <p className="font-mono text-xs text-ibm-gray-50 mt-3">
            Powered by{' '}
            <span className="text-ibm-blue">IBM Granite</span>
            {' '}on{' '}
            <span className="text-white">watsonx.ai</span>
            {' '}— job postings · OSU syllabi · optimized plans
          </p>
        </div>

        {/* CTA — sharp corners, inverts on hover */}
        <div className="mt-10 mb-16 animate-fade-in" style={{ animationDelay: '660ms' }}>
          <button
            onClick={onStart}
            className="group inline-flex items-center gap-3 font-mono text-sm font-bold uppercase tracking-[0.14em] px-10 py-4 bg-ibm-blue text-white border-2 border-ibm-blue transition-all duration-200 hover:bg-white hover:text-ibm-gray-100 active:scale-[0.98]"
          >
            Analyze My Path
            <span className="text-base transition-transform group-hover:translate-x-1.5 duration-200">→</span>
          </button>
        </div>

        {/* Stats — horizontal data bar */}
        <div
          className="border-t border-ibm-gray-80 pt-8 animate-fade-in"
          style={{ animationDelay: '820ms' }}
        >
          <div className="flex items-start justify-center divide-x divide-ibm-gray-80">
            {[
              { value: '30+', label: 'Job Postings' },
              { value: '35+', label: 'OSU Courses' },
              { value: '3',   label: 'AI Plans' },
            ].map(stat => (
              <div key={stat.label} className="flex-1 px-4 sm:px-8 text-center">
                <div className="font-mono font-bold text-white text-3xl sm:text-4xl leading-none">{stat.value}</div>
                <div className="font-mono text-ibm-gray-50 text-xs uppercase tracking-[0.18em] mt-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <span className="font-mono text-ibm-gray-70 text-xs tracking-widest">↓</span>
      </div>
    </section>
  )
}

function InputSection({ courses, careers, onAnalyze, loading }) {
  const [name, setName] = useState('')
  const [selectedCourses, setSelectedCourses] = useState([])
  const [career, setCareer] = useState('software_engineer')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (selectedCourses.length === 0) return
    onAnalyze({ name, courses_taken: selectedCourses, target_career: career })
  }

  return (
    <section className="py-20 px-6 bg-ibm-gray-100 border-t border-ibm-gray-80">
      <div className="max-w-4xl mx-auto">

        {/* Section header */}
        <div className="mb-12">
          <p className="font-mono text-xs text-ibm-blue uppercase tracking-[0.22em] mb-3">
            01 — Setup
          </p>
          <h2
            className="font-mono font-bold uppercase text-white leading-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}
          >
            Tell us about you
          </h2>
          <div className="h-px bg-ibm-gray-80 mt-6" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-12">

          {/* Name */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-[0.18em] text-ibm-gray-50 mb-4">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Roy"
              className="w-full bg-transparent text-white font-mono text-lg placeholder-ibm-gray-70 border-0 border-b border-ibm-gray-70 pb-3 outline-none focus:border-ibm-blue transition-colors duration-200"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Career path — joined data-table tiles */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-[0.18em] text-ibm-gray-50 mb-4">
              Target Career Path
            </label>
            <div className="border border-ibm-gray-80 flex flex-col sm:flex-row">
              {careers.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCareer(c.id)}
                  className={`relative flex-1 flex flex-col justify-between p-5 text-left transition-colors duration-150
                    border-b border-ibm-gray-80 sm:border-b-0 sm:border-r border-ibm-gray-80 last:border-b-0 last:border-r-0
                    ${career === c.id
                      ? 'bg-ibm-blue/8'
                      : 'bg-transparent hover:bg-ibm-gray-90/70'
                    }`}
                >
                  {/* Blue top bar on selected */}
                  {career === c.id && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-ibm-blue" />
                  )}
                  <div>
                    <span className="font-mono text-xs text-ibm-blue block mb-3 tracking-wider">
                      0{i + 1}
                    </span>
                    <span className={`font-mono font-bold uppercase text-sm block leading-snug ${career === c.id ? 'text-white' : 'text-ibm-gray-30'}`}>
                      {c.label}
                    </span>
                  </div>
                  <span className="text-ibm-gray-50 text-xs mt-4 leading-relaxed block">
                    {c.description}
                  </span>
                  {career === c.id && (
                    <span className="absolute top-3 right-3 font-mono text-ibm-blue text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Course selector */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-[0.18em] text-ibm-gray-50 mb-4">
              Completed Courses{' '}
              <span className="normal-case tracking-normal text-ibm-gray-70 ml-1">
                — select all you've taken
              </span>
            </label>
            <CourseSelector
              courses={courses}
              selected={selectedCourses}
              onChange={setSelectedCourses}
            />
          </div>

          {/* Submit */}
          <div>
            <button
              type="submit"
              disabled={selectedCourses.length === 0 || loading}
              className="group w-full flex items-center justify-center gap-3 font-mono text-sm font-bold uppercase tracking-[0.14em] px-10 py-4 bg-ibm-blue text-white border-2 border-ibm-blue transition-all duration-200 hover:bg-white hover:text-ibm-gray-100 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-ibm-blue disabled:hover:text-white"
            >
              {loading ? (
                <>
                  <span className="inline-block w-3 h-3 border border-white/40 border-t-white animate-spin" />
                  Analyzing with IBM Granite...
                </>
              ) : (
                <>
                  Analyze My Path
                  <span className="transition-transform group-hover:translate-x-1.5 duration-200 text-base">→</span>
                </>
              )}
            </button>

            {selectedCourses.length === 0 && (
              <p className="font-mono text-ibm-gray-70 text-xs uppercase tracking-[0.12em] text-center mt-4">
                Select at least one course to continue
              </p>
            )}
          </div>

        </form>
      </div>
    </section>
  )
}

function ResultsSection({ data }) {
  const [barsVisible, setBarsVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setBarsVisible(true), 200)
    return () => clearTimeout(t)
  }, [])

  return (
    <section className="py-16 px-6 bg-ibm-gray-100">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Personalized header */}
        <div className="animate-fade-in border-t border-ibm-gray-80 pt-12">
          <p className="font-mono text-xs text-ibm-blue uppercase tracking-[0.22em] mb-3">
            02 — Results
          </p>
          <h2
            className="font-mono font-bold uppercase text-white leading-tight"
            style={{ fontSize: 'clamp(24px, 3.5vw, 38px)' }}
          >
            {data.student_name ? `${data.student_name}'s` : 'Your'} Intelligence Report
          </h2>
          <p className="font-mono text-xs text-ibm-gray-50 mt-3">
            Target:{' '}
            <span className="text-ibm-blue capitalize">{data.target_career?.replace(/_/g, ' ')}</span>
            {' · '}
            <span className="text-ibm-gray-30">{data.pipeline_stats?.job_postings_analyzed} job postings analyzed</span>
          </p>
          <div className="h-px bg-ibm-gray-80 mt-6" />
        </div>

        {/* Radar + top skills to acquire row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SkillRadar data={data.radar_data} />
          </div>
          <div className="border border-ibm-gray-80 p-6">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-ibm-gray-50 mb-5">Top Skills to Acquire</p>
            <div className="space-y-3">
              {(data.top_skills_to_acquire || []).map((skill, i) => (
                <div key={skill} className="flex items-center gap-3">
                  <span className="text-ibm-blue text-xs font-mono w-5 flex-shrink-0">0{i + 1}</span>
                  <span className="text-white text-sm capitalize flex-1 font-mono">{skill}</span>
                  <div className="h-px w-16 bg-ibm-gray-80 overflow-hidden relative flex-shrink-0" style={{ height: '2px' }}>
                    <div
                      className="h-full bg-ibm-blue transition-all duration-700"
                      style={{ width: barsVisible ? `${Math.max(20, 100 - i * 10)}%` : '0%', transitionDelay: `${i * 80}ms` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gap cards */}
        <GapCards gaps={data.skill_gaps} />

        {/* Plan cards */}
        <PlanCards plans={data.plans} />

        {/* Overlap warnings */}
        {data.course_overlaps && data.course_overlaps.length > 0 && (
          <OverlapWarnings overlaps={data.course_overlaps} />
        )}

        {/* How it works */}
        <HowItWorks stats={data.pipeline_stats} />
      </div>
    </section>
  )
}

export default function App() {
  const [courses, setCourses] = useState([])
  const [careers, setCareers] = useState([])
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [studentName, setStudentName] = useState('')

  const inputRef = useRef(null)
  const resultsRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchCourses(), fetchCareers()])
      .then(([coursesData, careersData]) => {
        setCourses(coursesData.courses || [])
        setCareers(careersData.careers || [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleHeroStart = () => {
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleAnalyze = async (params) => {
    setError('')
    setStudentName(params.name)
    setAnalyzing(true)
    try {
      const data = await analyzeStudent(params)
      setResults(data)
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
    } catch (err) {
      setError(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-ibm-gray-100 font-sans">
      <Navbar />

      {analyzing && <LoadingOverlay studentName={studentName} />}

      <Hero onStart={handleHeroStart} />

      <div ref={inputRef}>
        <InputSection
          courses={courses}
          careers={careers}
          onAnalyze={handleAnalyze}
          loading={analyzing || loading}
        />
      </div>

      {error && (
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="bg-ibm-red/10 border border-ibm-red/30 px-6 py-4 text-ibm-red text-sm flex items-center gap-3 font-mono">
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {results && (
        <div ref={resultsRef}>
          <ResultsSection data={results} />
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-ibm-gray-80 mt-16 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-mono text-xs text-ibm-gray-70 uppercase tracking-[0.15em] text-center sm:text-left">
            IBM AI Skills Builder Hackathon · The Ohio State University
          </p>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-ibm-gray-70">Powered by</span>
            <span className="text-ibm-blue">ibm/granite-4-h-small</span>
            <span className="text-ibm-gray-70">on</span>
            <span className="text-white">watsonx.ai</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
