const BASE = '/api'

export async function fetchCourses() {
  const res = await fetch(`${BASE}/courses`)
  if (!res.ok) throw new Error('Failed to load courses')
  return res.json()
}

export async function fetchCareers() {
  const res = await fetch(`${BASE}/careers`)
  if (!res.ok) throw new Error('Failed to load careers')
  return res.json()
}

export async function analyzeStudent({ name, courses_taken, target_career }) {
  const res = await fetch(`${BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, courses_taken, target_career }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail || 'Analysis failed')
  }
  return res.json()
}

export async function runPipeline() {
  const res = await fetch(`${BASE}/run-pipeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run_stage1: true, run_stage2: true }),
  })
  if (!res.ok) throw new Error('Failed to start pipeline')
  return res.json()
}

export async function getPipelineStatus() {
  const res = await fetch(`${BASE}/pipeline-status`)
  if (!res.ok) throw new Error('Failed to get pipeline status')
  return res.json()
}
