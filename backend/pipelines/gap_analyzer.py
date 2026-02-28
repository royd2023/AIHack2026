from __future__ import annotations
"""
PIPELINE STAGE 3: Gap Analysis + Course Plan Optimizer

Runs in real-time per student request.
Uses precomputed skill_index.json and course_fingerprints.json.
Calls Granite to generate 3 personalized plan variants.
"""

import json
import logging
from pathlib import Path

from .watsonx_client import granite_generate, parse_json_response

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / "data"

DEPTH_SCORES = {"introductory": 0.33, "intermediate": 0.66, "advanced": 1.0}

PLAN_GENERATION_PROMPT = """You are an expert academic advisor for Ohio State University's CSE program. You have deep knowledge of the curriculum and job market.

STUDENT STATE:
- Name: {student_name}
- Completed courses: {completed_courses}
- Current skill coverage: {current_skills_json}
- Target career: {target_career}

TOP SKILL GAPS (ranked by market value):
{skill_gaps_json}

AVAILABLE COURSES (ranked by gap-closure value — these are the real OSU courses):
{available_courses_json}

Generate 3 distinct semester-by-semester plans starting Fall 2026:

Plan A — "Fastest to Job-Ready": Front-load the highest-demand technical skills. Close critical gaps ASAP. Prioritize skills with demand_score > 0.7.
Plan B — "Maximum Optionality": Choose courses that build transferable skills across multiple career paths. Hedge against career uncertainty with breadth.
Plan C — "Balanced Growth": Mix career-aligned courses with manageable workload. No more than 2 heavy technical courses per semester.

CONSTRAINTS (HARD RULES — do not violate):
- Maximum 18 credit hours per semester (typically 4-5 courses)
- Respect ALL prerequisites listed — never recommend a course if prerequisites aren't met
- Only use course numbers from the provided catalog
- Start from Fall 2026
- Plan 2-4 semesters ahead

Respond ONLY with valid JSON, no markdown, no backticks:
{{
  "plans": [
    {{
      "plan_name": "string",
      "icon": "🚀|🔀|⚖️",
      "strategy": "2 sentence tradeoff description",
      "semesters": [
        {{
          "semester": "Fall 2026",
          "courses": [{{"number": "CSE XXXX", "title": "Course Title", "credits": 3}}],
          "total_credits": 15,
          "rationale": "1 sentence explaining why these courses this semester"
        }}
      ],
      "projected_skill_coverage": 0-100,
      "estimated_semesters_remaining": 2,
      "top_skills_gained": ["skill1", "skill2", "skill3", "skill4", "skill5"]
    }}
  ]
}}"""


def load_skill_index() -> dict:
    path = DATA_DIR / "skill_index.json"
    if not path.exists():
        logger.warning("skill_index.json not found. Gap analysis will be limited.")
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_course_fingerprints() -> dict:
    path = DATA_DIR / "course_fingerprints.json"
    if not path.exists():
        logger.warning("course_fingerprints.json not found. Gap analysis will be limited.")
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def normalize_course_id(course_str: str) -> str:
    """Convert 'CSE 2231' or 'CSE2231' to 'CSE2231'."""
    return course_str.replace(" ", "").upper()


def compute_student_skills(completed_course_ids: list[str], fingerprints: dict) -> dict[str, float]:
    """
    Union all skills from completed courses.
    Returns: {skill_name: proficiency_score (0-1)}
    """
    student_skills: dict[str, float] = {}
    for cid in completed_course_ids:
        fp = fingerprints.get(cid, {})
        for skill in fp.get("skills_taught", []):
            name = skill.get("name", "")
            depth = DEPTH_SCORES.get(skill.get("depth", "introductory"), 0.33)
            student_skills[name] = max(student_skills.get(name, 0), depth)
    return student_skills


def compute_skill_gaps(
    student_skills: dict[str, float],
    career_path: str,
    skill_index: dict,
) -> list[dict]:
    """
    For each skill demanded by the target career, compute gap score.
    gap_score = demand_score * (1 - student_proficiency)
    """
    career_data = skill_index.get("career_paths", {}).get(career_path, {})
    career_skills = career_data.get("skills", [])

    gaps = []
    for skill in career_skills:
        name = skill.get("name", "")
        demand = skill.get("demand_score", 0)
        proficiency = student_skills.get(name, 0)
        gap = demand * (1 - proficiency)
        if gap > 0.05:  # Only meaningful gaps
            gaps.append({
                "name": name,
                "demand_score": demand,
                "student_proficiency": round(proficiency, 2),
                "gap_score": round(gap, 4),
                "category": skill.get("category", "technical"),
                "co_occurring_skills": skill.get("co_occurring_skills", []),
                "sample_companies": skill.get("sample_companies", []),
            })

    gaps.sort(key=lambda x: x["gap_score"], reverse=True)
    return gaps


def rank_available_courses(
    completed_ids: set[str],
    skill_gaps: list[dict],
    fingerprints: dict,
) -> list[dict]:
    """
    Score each uncompleted course by how many gap skills it teaches,
    weighted by demand score. Only include courses with met prerequisites.
    """
    gap_values = {g["name"]: g["demand_score"] for g in skill_gaps}
    ranked = []

    for cid, fp in fingerprints.items():
        if cid in completed_ids:
            continue

        # Check prerequisites
        prereqs = [normalize_course_id(p) for p in fp.get("prerequisites", [])]
        prereqs_met = all(p in completed_ids for p in prereqs)

        gap_closure_value = 0.0
        skills_covering_gaps = []
        for skill in fp.get("skills_taught", []):
            name = skill.get("name", "")
            if name in gap_values:
                depth = DEPTH_SCORES.get(skill.get("depth", "introductory"), 0.33)
                gap_closure_value += gap_values[name] * depth
                skills_covering_gaps.append(name)

        ranked.append({
            "number": fp.get("number", cid),
            "title": fp.get("title", ""),
            "credits": fp.get("credits", 3),
            "prerequisites": fp.get("prerequisites", []),
            "prerequisites_met": prereqs_met,
            "gap_closure_value": round(gap_closure_value, 4),
            "skills_covering_gaps": skills_covering_gaps[:8],
            "career_relevance": fp.get("career_relevance", {}),
        })

    ranked.sort(key=lambda x: (x["prerequisites_met"], x["gap_closure_value"]), reverse=True)
    return ranked


def analyze_gap(
    courses_taken: list[str],
    target_career: str,
    student_name: str = "Student",
) -> dict:
    """
    Main Stage 3 entrypoint. Returns full gap analysis + 3 optimized plans.
    """
    skill_index = load_skill_index()
    fp_data = load_course_fingerprints()
    fingerprints = fp_data.get("courses", {})
    similarity_pairs = fp_data.get("course_similarity_pairs", [])
    metadata = fp_data.get("metadata", {})
    si_metadata = skill_index.get("metadata", {})

    # Normalize input course IDs
    completed_ids = {normalize_course_id(c) for c in courses_taken}
    completed_ids_ordered = [normalize_course_id(c) for c in courses_taken]

    # Stage 3a: Student skill state
    student_skills = compute_student_skills(list(completed_ids), fingerprints)

    # Stage 3b: Skill gaps
    skill_gaps = compute_skill_gaps(student_skills, target_career, skill_index)

    # Stage 3c: Rank available courses
    available_courses = rank_available_courses(completed_ids, skill_gaps, fingerprints)

    # Course info for completed courses (for display)
    completed_course_details = []
    for cid in completed_ids_ordered:
        fp = fingerprints.get(cid, {})
        if fp:
            completed_course_details.append({"number": fp.get("number", cid), "title": fp.get("title", cid)})
        else:
            completed_course_details.append({"number": cid, "title": cid})

    # Stage 3d: Generate 3 plans with Granite
    plans = []
    if skill_index and fingerprints:
        try:
            prompt = PLAN_GENERATION_PROMPT.format(
                student_name=student_name,
                completed_courses=json.dumps(completed_course_details, indent=2),
                current_skills_json=json.dumps(
                    sorted(student_skills.items(), key=lambda x: x[1], reverse=True)[:20], indent=2
                ),
                target_career=target_career,
                skill_gaps_json=json.dumps(skill_gaps[:15], indent=2),
                available_courses_json=json.dumps(
                    [c for c in available_courses[:20] if c["prerequisites_met"]], indent=2
                ),
            )
            raw = granite_generate(prompt)
            parsed = parse_json_response(raw)
            plans = parsed.get("plans", [])
        except Exception as e:
            logger.error(f"Plan generation failed: {e}")
            plans = []

    # Overlap warnings for completed + recommended courses
    recommended_ids = set()
    for plan in plans:
        for sem in plan.get("semesters", []):
            for c in sem.get("courses", []):
                recommended_ids.add(normalize_course_id(c.get("number", "")))

    relevant_overlaps = [
        p for p in similarity_pairs
        if (p["course_a"] in recommended_ids or p["course_b"] in recommended_ids
            or p["course_a"] in completed_ids or p["course_b"] in completed_ids)
    ][:10]

    # Add human-readable course titles to overlaps
    for pair in relevant_overlaps:
        fp_a = fingerprints.get(pair["course_a"], {})
        fp_b = fingerprints.get(pair["course_b"], {})
        pair["title_a"] = fp_a.get("title", pair["course_a"])
        pair["title_b"] = fp_b.get("title", pair["course_b"])

    # Skill category breakdown for radar chart
    category_groups = {
        "Programming": ["python", "java", "javascript", "typescript", "c++", "c#", "golang", "rust", "scala"],
        "Data/ML": ["machine learning", "deep learning", "tensorflow", "pytorch", "data science", "nlp", "computer vision", "pandas", "scikit-learn", "statistics", "data mining"],
        "Systems/Architecture": ["operating systems", "distributed systems", "microservices", "system design", "computer architecture", "networking", "linux"],
        "Web/Cloud": ["react", "node.js", "aws", "azure", "gcp", "docker", "kubernetes", "rest api", "graphql", "sql", "nosql", "postgresql", "mongodb"],
        "Math/Statistics": ["linear algebra", "calculus", "probability", "statistics", "discrete mathematics", "algorithms", "data structures"],
        "Communication": ["communication", "presentation", "writing", "collaboration", "teamwork", "agile", "scrum"],
        "Security": ["cybersecurity", "cryptography", "network security", "penetration testing", "secure coding"],
        "DevOps": ["git", "ci/cd", "jenkins", "devops", "testing", "debugging", "docker", "kubernetes"],
    }

    career_skills_by_cat = {}
    for skill in skill_index.get("career_paths", {}).get(target_career, {}).get("skills", [])[:60]:
        for cat, keywords in category_groups.items():
            if any(kw in skill["name"] for kw in keywords):
                career_skills_by_cat.setdefault(cat, []).append(skill["demand_score"])

    student_skills_by_cat = {}
    for skill_name, prof in student_skills.items():
        for cat, keywords in category_groups.items():
            if any(kw in skill_name for kw in keywords):
                student_skills_by_cat.setdefault(cat, []).append(prof)

    radar_data = []
    for cat in category_groups:
        career_scores = career_skills_by_cat.get(cat, [0])
        student_scores = student_skills_by_cat.get(cat, [0])
        radar_data.append({
            "category": cat,
            "career_target": round(min(sum(career_scores) / max(len(career_scores), 1) * 100, 100), 1),
            "student_current": round(min(sum(student_scores) / max(len(student_scores), 1) * 100, 100), 1),
        })

    # Which courses teach each gap skill
    gap_course_map = {}
    for gap in skill_gaps[:10]:
        sname = gap["name"]
        teaching_courses = []
        for cid, fp in fingerprints.items():
            for s in fp.get("skills_taught", []):
                if s.get("name") == sname:
                    teaching_courses.append(fp.get("number", cid))
        gap["taught_in"] = teaching_courses[:4]

    return {
        "student_name": student_name,
        "target_career": target_career,
        "current_skills": [
            {"name": k, "proficiency": round(v, 2)}
            for k, v in sorted(student_skills.items(), key=lambda x: x[1], reverse=True)
        ],
        "skill_gaps": skill_gaps[:15],
        "radar_data": radar_data,
        "plans": plans,
        "course_overlaps": relevant_overlaps,
        "top_skills_to_acquire": [g["name"] for g in skill_gaps[:8]],
        "pipeline_stats": {
            "job_postings_analyzed": si_metadata.get("total_postings_analyzed", 0),
            "courses_fingerprinted": len(fingerprints),
            "data_sources": "LinkedIn, Indeed, Glassdoor (job postings); syllabi.engineering.osu.edu (course data)",
            "model_used": "ibm/granite-3-3-8b-instruct",
            "embedding_model": "ibm/granite-embedding-278m-multilingual",
        },
    }
