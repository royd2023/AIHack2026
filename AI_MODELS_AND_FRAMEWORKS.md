# AI Models & Frameworks Used in BuckeyePathfinder

## IBM Granite Models

### 1. `ibm/granite-4-h-small` — Text Generation

- **Type:** Large Language Model (LLM)
- **Purpose:** Powers all natural-language reasoning across the 3-stage pipeline
- **Parameters used:**
  - `MAX_NEW_TOKENS`: 8192
  - `TEMPERATURE`: 0.1 (low for deterministic, structured output)
  - `REPETITION_PENALTY`: 1.1
- **Where it's used:**

| Pipeline Stage | File | What It Does |
|---|---|---|
| **Stage 1 — Skill Extraction** | `backend/pipelines/skill_extractor.py` | Reads 30+ real job postings (from LinkedIn, Indeed, Glassdoor) and extracts structured skill data (name, category, importance) for each posting. Aggregates results into a demand-scored skill index per career path. |
| **Stage 2 — Course Fingerprinting** | `backend/pipelines/course_fingerprinter.py` | Analyzes 35+ OSU course syllabi and learning outcomes to extract what skills each course teaches, proficiency levels, and career relevance scores. Also processes student reviews for additional insight. |
| **Stage 3 — Gap Analysis & Plan Generation** | `backend/pipelines/gap_analyzer.py` | Takes a student's completed courses and target career, computes skill gaps against market demand, then generates 3 Pareto-optimal course plans (Fastest to Job-Ready, Maximum Optionality, Balanced Growth). |

### 2. `ibm/granite-embedding-278m-multilingual` — Embeddings

- **Type:** Text Embedding Model (278M parameters, multilingual)
- **Purpose:** Generates dense vector representations of course content for semantic similarity
- **Where it's used:**

| Pipeline Stage | File | What It Does |
|---|---|---|
| **Stage 2 — Course Fingerprinting** | `backend/pipelines/course_fingerprinter.py` | Embeds course descriptions into vectors, then computes cosine similarity between courses to detect content overlap and redundancy. |
| **Stage 3 — Gap Analysis** | `backend/pipelines/gap_analyzer.py` | Uses precomputed embeddings to identify courses with overlapping content so students aren't recommended redundant coursework. |

---

## AI Framework / SDK

### `ibm-watsonx-ai` (Python SDK)

- **What it is:** IBM's official Python SDK for interacting with foundation models hosted on the **watsonx.ai** platform
- **Key classes used:**
  - `Credentials` — authenticates with the watsonx.ai API via API key
  - `ModelInference` — sends chat/generation requests to Granite LLM
  - `Embeddings` — generates text embeddings via Granite Embedding model
- **Client wrapper:** `backend/pipelines/watsonx_client.py` — centralizes all model initialization, retry logic (exponential backoff), and JSON response parsing
- **Authentication:** Uses environment variables (`WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, `WATSONX_URL`) loaded from a `.env` file

---

## Additional Libraries

| Library | Purpose |
|---|---|
| **FastAPI** | Backend REST API framework |
| **Uvicorn** | ASGI server for running FastAPI |
| **NumPy** | Numerical operations (cosine similarity on embeddings) |
| **scikit-learn** | Additional similarity/distance computations |
| **httpx** | HTTP client (async-capable) |
| **python-dotenv** | Loads environment variables from `.env` |

---

## Architecture Summary

```
Student Input → FastAPI Backend
                    ↓
    ┌───────────────────────────────────┐
    │  Stage 1: Skill Extraction        │  ← Granite 4 LLM
    │  (job postings → skill index)     │
    ├───────────────────────────────────┤
    │  Stage 2: Course Fingerprinting   │  ← Granite 4 LLM + Granite Embeddings
    │  (syllabi → skill fingerprints)   │
    ├───────────────────────────────────┤
    │  Stage 3: Gap Analysis            │  ← Granite 4 LLM
    │  (student profile → 3 plans)      │
    └───────────────────────────────────┘
                    ↓
           React Frontend (Vite)
```

All AI inference runs on **IBM watsonx.ai** (cloud). No models are run locally.
