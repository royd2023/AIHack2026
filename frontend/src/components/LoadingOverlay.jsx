import { useEffect, useState } from 'react'

const STEPS = [
  { id: 1, icon: '🔍', label: 'Mapping your current skills with IBM Granite...', duration: 3000 },
  { id: 2, icon: '📊', label: 'Analyzing skill gaps against real market demand...', duration: 5000 },
  { id: 3, icon: '🧠', label: 'IBM Granite is optimizing your course plan...', duration: null },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ibm-gray-100/95 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-ibm-blue/10 border border-ibm-blue/30 rounded-full px-4 py-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-ibm-blue animate-pulse" />
            <span className="text-ibm-blue text-sm font-mono">ibm/granite-4-h-small</span>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">
            Analyzing {studentName ? `${studentName}'s` : 'your'} path{dots}
          </h2>
          <p className="text-ibm-gray-30 text-sm">IBM Granite is processing your academic profile</p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-ibm-gray-50 mb-2">
            <span>Processing</span>
            <span>{Math.round(totalProgress)}%</span>
          </div>
          <div className="h-1.5 bg-ibm-gray-80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-ibm-blue to-ibm-cyan rounded-full transition-all duration-700 ease-out"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {STEPS.map((step, idx) => {
            const isDone = completedSteps.includes(idx)
            const isActive = currentStep === idx && !isDone
            return (
              <div
                key={step.id}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-500 ${isDone
                    ? 'bg-ibm-green/5 border-ibm-green/20 opacity-70'
                    : isActive
                      ? 'bg-ibm-blue/10 border-ibm-blue/30 blue-glow'
                      : 'bg-ibm-gray-90/50 border-ibm-gray-80/50 opacity-40'
                  }`}
              >
                {/* Status indicator */}
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                  {isDone ? (
                    <div className="w-6 h-6 rounded-full bg-ibm-green/20 border border-ibm-green flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-ibm-green" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : isActive ? (
                    <div className="w-6 h-6 rounded-full border-2 border-ibm-blue border-t-transparent animate-spin" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border border-ibm-gray-70" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${isDone ? 'text-ibm-green' : isActive ? 'text-white' : 'text-ibm-gray-50'}`}>
                    <span className="mr-2">{step.icon}</span>
                    {step.label}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* IBM branding */}
        <div className="mt-8 text-center">
          <p className="text-ibm-gray-70 text-xs">
            Powered by{' '}
            <span className="text-ibm-blue font-mono">ibm/granite-4-h-small</span>
            {' '}+{' '}
            <span className="text-ibm-cyan font-mono">ibm/granite-embedding-278m-multilingual</span>
            {' '}on{' '}
            <span className="text-white font-semibold">IBM watsonx.ai</span>
          </p>
        </div>
      </div>
    </div>
  )
}
