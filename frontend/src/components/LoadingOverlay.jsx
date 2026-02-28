import { useEffect, useState } from 'react'

const STEPS = [
  { id: 1, label: 'Mapping your current skills with IBM Granite', duration: 3000 },
  { id: 2, label: 'Analyzing skill gaps against real market demand', duration: 5000 },
  { id: 3, label: 'IBM Granite is optimizing your course plan', duration: 12000 },
  { id: 4, label: 'Verifying plan accuracy — AI self-review in progress', duration: null },
]

export default function LoadingOverlay({ studentName }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState([])
  const [dots, setDots] = useState('')

  useEffect(() => {
    let timeout
    const runStep = (stepIdx) => {
      if (stepIdx >= STEPS.length) return
      setCurrentStep(stepIdx)
      const step = STEPS[stepIdx]
      if (step.duration) {
        timeout = setTimeout(() => {
          setCompletedSteps(prev => [...prev, stepIdx])
          runStep(stepIdx + 1)
        }, step.duration)
      }
    }
    runStep(0)
    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const totalProgress = Math.min(
    ((completedSteps.length / STEPS.length) * 80) + (currentStep > 0 ? 10 : 5),
    90
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ibm-gray-100/97 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-6 animate-fade-in">

        {/* Header */}
        <div className="mb-10">
          <span className="font-mono text-xs text-ibm-blue border border-ibm-blue/30 px-2 py-0.5 mb-6 inline-block">
            [ ibm/granite-4-h-small ]
          </span>
          <h2 className="font-mono font-bold uppercase text-white leading-tight mt-4"
              style={{ fontSize: 'clamp(22px, 3.5vw, 32px)' }}>
            Analyzing {studentName ? `${studentName}'s` : 'your'} path{dots}
          </h2>
          <p className="font-mono text-xs text-ibm-gray-50 mt-2 uppercase tracking-wider">
            IBM Granite is processing your academic profile
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between font-mono text-xs text-ibm-gray-50 mb-2 uppercase tracking-wider">
            <span>Processing</span>
            <span>{Math.round(totalProgress)}%</span>
          </div>
          <div className="h-px bg-ibm-gray-80 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-ibm-blue to-ibm-cyan transition-all duration-700 ease-out"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {STEPS.map((step, idx) => {
            const isDone   = completedSteps.includes(idx)
            const isActive = currentStep === idx && !isDone
            return (
              <div
                key={step.id}
                className={`flex items-center gap-4 px-4 py-3 border transition-all duration-500 ${
                  isDone
                    ? 'border-ibm-green/20 bg-ibm-green/5 opacity-70'
                    : isActive
                      ? 'border-ibm-blue/30 bg-ibm-blue/8'
                      : 'border-ibm-gray-80/50 opacity-30'
                }`}
              >
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                  {isDone ? (
                    <span className="font-mono text-ibm-green text-xs">✓</span>
                  ) : isActive ? (
                    <span className="inline-block w-3 h-3 border border-ibm-blue border-t-transparent animate-spin" />
                  ) : (
                    <span className="font-mono text-ibm-gray-70 text-xs">○</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`font-mono text-xs ${isDone ? 'text-ibm-green' : isActive ? 'text-white' : 'text-ibm-gray-50'}`}>
                    {`0${step.id}`} — {step.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-ibm-gray-80">
          <p className="font-mono text-ibm-gray-70 text-xs text-center">
            <span className="text-ibm-blue">ibm/granite-4-h-small</span>
            {' '}+{' '}
            <span className="text-ibm-cyan">ibm/granite-embedding-278m-multilingual</span>
            {' '}·{' '}
            <span className="text-white">IBM watsonx.ai</span>
          </p>
        </div>
      </div>
    </div>
  )
}
