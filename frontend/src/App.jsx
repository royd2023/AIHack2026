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
    <nav className="fixed top-0 left-0 right-0 z-30 border-b border-ibm-gray-80 bg-ibm-gray-100/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-white font-bold text-lg tracking-tight">
            <span className="gradient-text">Buckeye</span>
            <span className="text-white">Pathfinder</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 bg-ibm-blue/10 border border-ibm-blue/20 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-ibm-blue" />
            <span className="text-ibm-blue text-xs font-mono">IBM watsonx.ai</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-ibm-gray-50 text-xs">
          <span className="hidden sm:inline">Powered by</span>
          <span className="font-mono text-ibm-gray-30">ibm/granite-3-3-8b-instruct</span>
        </div>
      </div>
    </nav>
  )
}

function Hero({ onStart }) {
  return (
    <section className="pt-14 min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#4589ff 1px, transparent 1px), linear-gradient(90deg, #4589ff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      {/* Radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-ibm-blue/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-ibm-gray-90 border border-ibm-gray-80 rounded-full px-4 py-2 mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-ibm-green animate-pulse" />
          <span className="text-ibm-gray-30 text-sm">IBM AI Skills Builder Hackathon @ The Ohio State University</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4 leading-tight animate-slide-up">
          <span className="gradient-text">BuckeyePathfinder</span>
        </h1>
        <p className="text-xl sm:text-2xl text-ibm-gray-30 mb-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
          AI-powered academic planning aligned with your career
        </p>
        <p className="text-ibm-gray-50 text-base mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '200ms' }}>
          Powered by <span className="text-ibm-blue font-mono">IBM Granite</span> on <span className="text-white font-semibold">watsonx.ai</span> —
          analyzes real job postings and OSU course syllabi to generate optimized course plans personalized to your goals.
        </p>

        {/* CTA */}
        <button
          onClick={onStart}
          className="group inline-flex items-center gap-3 bg-ibm-blue hover:bg-ibm-blue-hover text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all duration-200 hover:shadow-lg hover:shadow-ibm-blue/20 animate-slide-up"
          style={{ animationDelay: '300ms' }}
        >
          Analyze My Path
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mt-16 max-w-xl mx-auto animate-fade-in" style={{ animationDelay: '500ms' }}>
          {[
            { value: '30+', label: 'Real job postings' },
            { value: '35+', label: 'OSU courses' },
            { value: '3', label: 'AI-generated plans' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold gradient-text font-mono">{stat.value}</div>
              <div className="text-ibm-gray-50 text-xs mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-5 h-5 text-ibm-gray-70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
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
    <section className="py-20 px-6 bg-ibm-gray-90/50">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-3">Tell us about yourself</h2>
          <p className="text-ibm-gray-50">Select your completed courses and target career to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-ibm-gray-30 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Roy"
              className="w-full bg-ibm-gray-80 border border-ibm-gray-70 rounded-lg px-4 py-3 text-white placeholder-ibm-gray-50 text-sm outline-none focus:border-ibm-blue transition-colors"
            />
          </div>

          {/* Career path */}
          <div>
            <label className="block text-sm font-medium text-ibm-gray-30 mb-2">
              Target Career Path
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {careers.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCareer(c.id)}
                  className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                    career === c.id
                      ? 'border-ibm-blue bg-ibm-blue/10 text-white'
                      : 'border-ibm-gray-70 bg-ibm-gray-80/50 text-ibm-gray-30 hover:border-ibm-gray-50'
                  }`}
                >
                  <span className="text-2xl">{c.emoji}</span>
                  <span className="font-semibold text-sm">{c.label}</span>
                  <span className="text-xs text-ibm-gray-50 leading-tight">{c.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Course selector */}
          <div>
            <label className="block text-sm font-medium text-ibm-gray-30 mb-2">
              Completed Courses
              <span className="ml-2 text-ibm-gray-50 font-normal">(select all you've taken)</span>
            </label>
            <CourseSelector
              courses={courses}
              selected={selectedCourses}
              onChange={setSelectedCourses}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={selectedCourses.length === 0 || loading}
            className="w-full flex items-center justify-center gap-3 bg-ibm-blue hover:bg-ibm-blue-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-8 py-4 rounded-xl text-base transition-all duration-200 hover:shadow-lg hover:shadow-ibm-blue/20"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing with IBM Granite...
              </>
            ) : (
              <>
                Analyze My Path
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </>
            )}
          </button>

          {selectedCourses.length === 0 && (
            <p className="text-ibm-gray-50 text-xs text-center">
              Select at least one completed course to continue
            </p>
          )}
        </form>
      </div>
    </section>
  )
}

function ResultsSection({ data }) {
  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Personalized header */}
        <div className="text-center animate-fade-in">
          <h2 className="text-3xl font-bold text-white mb-2">
            {data.student_name ? `${data.student_name}'s` : 'Your'} Career Intelligence Report
          </h2>
          <p className="text-ibm-gray-50">
            Target:{' '}
            <span className="text-ibm-blue capitalize font-medium">
              {data.target_career?.replace(/_/g, ' ')}
            </span>
            {' '}·{' '}
            <span className="text-ibm-gray-30">
              {data.pipeline_stats?.job_postings_analyzed} job postings analyzed
            </span>
          </p>
        </div>

        {/* Radar + top skills to acquire row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SkillRadar data={data.radar_data} />
          </div>
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-base font-semibold text-white mb-4">Top Skills to Acquire</h3>
            <div className="space-y-2">
              {(data.top_skills_to_acquire || []).map((skill, i) => (
                <div key={skill} className="flex items-center gap-3">
                  <span className="text-ibm-gray-50 text-xs font-mono w-4">{i + 1}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-white text-sm capitalize">{skill}</span>
                  </div>
                  <div className="h-1.5 w-16 bg-ibm-gray-80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ibm-blue rounded-full"
                      style={{ width: `${Math.max(20, 100 - i * 10)}%` }}
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
          <div className="bg-ibm-red/10 border border-ibm-red/30 rounded-xl px-6 py-4 text-ibm-red text-sm flex items-center gap-3">
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
          <div className="text-ibm-gray-70 text-sm text-center sm:text-left">
            Built for <span className="text-ibm-gray-50">IBM AI Skills Builder Hackathon</span> @ The Ohio State University
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-ibm-gray-70">Powered by</span>
            <span className="font-mono text-ibm-blue">ibm/granite-3-3-8b-instruct</span>
            <span className="text-ibm-gray-70">on</span>
            <span className="text-white font-semibold">IBM watsonx.ai</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
