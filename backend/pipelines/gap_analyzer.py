from __future__ import annotations
"""
PIPELINE STAGE 3: Gap Analysis + Course Plan Optimizer

Runs in real-time per student request.
Uses precomputed skill_index.json and course_fingerprints.json.
Calls Granite to generate 3 personalized plan variants.
"""

import json
import logging
import time
from pathlib import Path

from .watsonx_client import granite_generate, parse_json_response

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / "data"

DEPTH_SCORES = {"introductory": 0.33, "intermediate": 0.66, "advanced": 1.0}

# Mapping from frontend career IDs to possible skill_index keys
CAREER_KEY_MAP = {
    "software_engineer": ["software_engineer", "Software Engineering", "software_engineering", "Software Engineer"],
    "data_scientist": ["data_scientist", "Data Science", "data_science", "Data Scientist"],
    "product_manager": ["product_manager", "Product Management", "product_management", "Product Manager"],
}


def _resolve_career_key(career_path: str, career_paths_dict: dict) -> str:
    """Find the matching key in the skill index for a given career path ID."""
    # Direct match first
    if career_path in career_paths_dict:
        return career_path
    # Try mapped variants
    for variant in CAREER_KEY_MAP.get(career_path, []):
        if variant in career_paths_dict:
            return variant
    # Fuzzy fallback: case-insensitive substring match
    career_lower = career_path.lower().replace("_", " ")
    for key in career_paths_dict:
        if career_lower in key.lower() or key.lower().replace(" ", "_") == career_path:
            return key
    return career_path

PLAN_SYSTEM_PROMPT = "You are an expert academic advisor API for Ohio State University's CSE program. You respond with ONLY valid JSON — no explanation, no preamble, no markdown fences. Your entire response must be parseable by json.loads()."

CRITIQUE_SYSTEM_PROMPT = "You are a strict academic advisor auditor for Ohio State University's CSE program. You respond with ONLY valid JSON — no explanation, no preamble, no markdown fences. Your entire response must be parseable by json.loads()."

CRITIQUE_USER_PROMPT = """Review these 3 course plans for a student targeting {career_path}.

PLANS TO REVIEW:
{plans_json}

AVAILABLE COURSES (with prerequisites):
{available_courses_json}

Check each plan for:
1. PREREQUISITE VIOLATIONS — any course scheduled before its prerequisites are completed?
2. WORKLOAD BALANCE — any semester with 3+ hard technical courses (CSE 3000+ level)?
3. SKILL COVERAGE GAPS — does the plan address the top skill gaps?
4. REDUNDANCY — are any high-overlap courses in the same plan?
5. FEASIBILITY — are all courses plausibly real OSU CSE courses?

Return ONLY this JSON:
{{
  "critiques": [
    {{
      "plan_name": "...",
      "issues_found": [
        {{"type": "prerequisite_violation|workload|coverage_gap|redundancy|feasibility", "severity": "critical|warning", "description": "specific issue", "fix": "specific recommendation"}}
      ],
      "score": 0
    }}
  ]
}}"""

REFINEMENT_SYSTEM_PROMPT = "You are an expert academic advisor API for Ohio State University's CSE program. You respond with ONLY valid JSON — no explanation, no preamble, no markdown fences. Your entire response must be parseable by json.loads()."

REFINEMENT_USER_PROMPT = """Fix all critical issues in these course plans while preserving each plan's strategy.

ORIGINAL PLANS:
{plans_json}

CRITIQUES:
{critiques_json}

AVAILABLE COURSES:
{available_courses_json}

Generate improved plans fixing every critical issue. Return ONLY this JSON (same format as original plans, with one extra field per plan):
{{
  "plans": [
    {{
      "plan_name": "...",
      "icon": "...",
      "strategy": "...",
      "semesters": [...],
      "projected_skill_coverage": 0,
      "estimated_semesters_remaining": 0,
      "top_skills_gained": [],
      "improvements_made": ["list of what was fixed"]
    }}
  ]
}}"""

PLAN_USER_PROMPT = """Student: {student_name}
Completed courses: {completed_courses}
Current skills: {current_skills_json}
Target career: {target_career}

Top skill gaps (by market demand):
{skill_gaps_json}

Available courses (by gap-closure value):
{available_courses_json}

Generate exactly 3 semester-by-semester plans starting Fall 2026 (2-4 semesters each, max 18 credits/semester, respect prerequisites, only use courses from the catalog above).
- Plan A "Fastest to Job-Ready": prioritize highest-demand skills
- Plan B "Maximum Optionality": broad transferable skills across paths
- Plan C "Balanced Growth": mix career-aligned with manageable workload

Return ONLY this JSON (no other text):
{{
  "plans": [
    {{
      "plan_name": "Fastest to Job-Ready",
      "icon": "🚀",
      "strategy": "Two sentence strategy description.",
      "semesters": [
        {{
          "semester": "Fall 2026",
          "courses": [{{"number": "CSE 3341", "title": "Course Title", "credits": 3}}],
          "total_credits": 15,
          "rationale": "One sentence rationale."
        }}
      ],
      "projected_skill_coverage": 80,
      "estimated_semesters_remaining": 2,
      "top_skills_gained": ["skill1", "skill2", "skill3"]
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


def _derive_skills_from_metadata(course_id: str, raw_courses: list) -> list[dict]:
    """
    Fallback: derive skills from raw course metadata (title, description,
    learning outcomes) when Watson fingerprinting returned no skills.
    Uses keyword matching against known skill vocabulary.
    """
    SKILL_KEYWORDS = {
        # Programming
        "python": {"name": "python", "depth": "intermediate", "category": "technical"},
        "java": {"name": "java", "depth": "intermediate", "category": "technical"},
        "c++": {"name": "c++", "depth": "intermediate", "category": "technical"},
        "c programming": {"name": "c", "depth": "intermediate", "category": "technical"},
        "javascript": {"name": "javascript", "depth": "intermediate", "category": "technical"},
        "programming": {"name": "programming", "depth": "intermediate", "category": "technical"},
        "object-oriented": {"name": "object-oriented programming", "depth": "intermediate", "category": "technical"},
        "software component": {"name": "software engineering", "depth": "intermediate", "category": "methodology"},
        "software engineering": {"name": "software engineering", "depth": "intermediate", "category": "methodology"},
        "software design": {"name": "software design", "depth": "intermediate", "category": "methodology"},
        "design-by-contract": {"name": "software engineering", "depth": "advanced", "category": "methodology"},
        # Data structures & algorithms
        "data structure": {"name": "data structures", "depth": "intermediate", "category": "technical"},
        "algorithm": {"name": "algorithms", "depth": "intermediate", "category": "technical"},
        "sorting": {"name": "algorithms", "depth": "intermediate", "category": "technical"},
        "searching": {"name": "algorithms", "depth": "introductory", "category": "technical"},
        "recursion": {"name": "algorithms", "depth": "intermediate", "category": "technical"},
        "hashing": {"name": "data structures", "depth": "intermediate", "category": "technical"},
        "linked": {"name": "data structures", "depth": "intermediate", "category": "technical"},
        "tree": {"name": "data structures", "depth": "intermediate", "category": "technical"},
        "graph": {"name": "graph algorithms", "depth": "intermediate", "category": "technical"},
        "np-complete": {"name": "algorithms", "depth": "advanced", "category": "technical"},
        # Math/foundations
        "discrete": {"name": "discrete mathematics", "depth": "intermediate", "category": "technical"},
        "logic": {"name": "discrete mathematics", "depth": "introductory", "category": "technical"},
        "proof": {"name": "discrete mathematics", "depth": "intermediate", "category": "technical"},
        "induction": {"name": "discrete mathematics", "depth": "intermediate", "category": "technical"},
        "asymptotic": {"name": "algorithms", "depth": "intermediate", "category": "technical"},
        "probability": {"name": "probability", "depth": "intermediate", "category": "technical"},
        "statistics": {"name": "statistics", "depth": "intermediate", "category": "technical"},
        "linear algebra": {"name": "linear algebra", "depth": "intermediate", "category": "technical"},
        "numerical": {"name": "numerical methods", "depth": "intermediate", "category": "technical"},
        # Systems
        "operating system": {"name": "operating systems", "depth": "intermediate", "category": "technical"},
        "process": {"name": "operating systems", "depth": "introductory", "category": "technical"},
        "memory management": {"name": "operating systems", "depth": "intermediate", "category": "technical"},
        "cpu scheduling": {"name": "operating systems", "depth": "intermediate", "category": "technical"},
        "assembly": {"name": "computer architecture", "depth": "intermediate", "category": "technical"},
        "computer organization": {"name": "computer architecture", "depth": "intermediate", "category": "technical"},
        "machine level": {"name": "computer architecture", "depth": "intermediate", "category": "technical"},
        "pointer": {"name": "c", "depth": "intermediate", "category": "technical"},
        "low-level": {"name": "computer architecture", "depth": "intermediate", "category": "technical"},
        # Databases
        "database": {"name": "sql", "depth": "intermediate", "category": "tool"},
        "sql": {"name": "sql", "depth": "intermediate", "category": "tool"},
        "relational": {"name": "sql", "depth": "intermediate", "category": "tool"},
        "normalization": {"name": "database design", "depth": "intermediate", "category": "technical"},
        "query": {"name": "sql", "depth": "intermediate", "category": "tool"},
        "data warehouse": {"name": "data warehousing", "depth": "intermediate", "category": "technical"},
        "cloud": {"name": "cloud computing", "depth": "intermediate", "category": "technical"},
        # Networking
        "network": {"name": "networking", "depth": "intermediate", "category": "technical"},
        "tcp/ip": {"name": "networking", "depth": "intermediate", "category": "technical"},
        "protocol": {"name": "networking", "depth": "intermediate", "category": "technical"},
        "wireless": {"name": "networking", "depth": "introductory", "category": "technical"},
        # AI/ML
        "artificial intelligence": {"name": "machine learning", "depth": "introductory", "category": "technical"},
        "machine learning": {"name": "machine learning", "depth": "intermediate", "category": "technical"},
        "neural network": {"name": "deep learning", "depth": "intermediate", "category": "technical"},
        "deep learning": {"name": "deep learning", "depth": "intermediate", "category": "technical"},
        "natural language": {"name": "nlp", "depth": "intermediate", "category": "technical"},
        "computer vision": {"name": "computer vision", "depth": "intermediate", "category": "technical"},
        "data mining": {"name": "data mining", "depth": "intermediate", "category": "technical"},
        "pattern recognition": {"name": "machine learning", "depth": "intermediate", "category": "technical"},
        "classification": {"name": "machine learning", "depth": "intermediate", "category": "technical"},
        "clustering": {"name": "machine learning", "depth": "intermediate", "category": "technical"},
        # Web/Software project
        "web application": {"name": "web development", "depth": "intermediate", "category": "technical"},
        "client-side": {"name": "web development", "depth": "introductory", "category": "technical"},
        "server-side": {"name": "web development", "depth": "introductory", "category": "technical"},
        "interactive": {"name": "software engineering", "depth": "intermediate", "category": "technical"},
        # Security
        "security": {"name": "cybersecurity", "depth": "intermediate", "category": "technical"},
        "cryptography": {"name": "cryptography", "depth": "intermediate", "category": "technical"},
        "encryption": {"name": "cryptography", "depth": "intermediate", "category": "technical"},
        # Soft skills
        "team": {"name": "teamwork", "depth": "introductory", "category": "soft_skill"},
        "group project": {"name": "collaboration", "depth": "intermediate", "category": "soft_skill"},
        "communication": {"name": "communication", "depth": "introductory", "category": "soft_skill"},
        "presentation": {"name": "communication", "depth": "introductory", "category": "soft_skill"},
        "documentation": {"name": "technical writing", "depth": "introductory", "category": "soft_skill"},
        "writing": {"name": "technical writing", "depth": "introductory", "category": "soft_skill"},
        "ethics": {"name": "ethics", "depth": "introductory", "category": "soft_skill"},
        # SE practices
        "testing": {"name": "testing", "depth": "intermediate", "category": "methodology"},
        "debugging": {"name": "debugging", "depth": "intermediate", "category": "methodology"},
        "version control": {"name": "git", "depth": "introductory", "category": "tool"},
        "agile": {"name": "agile", "depth": "introductory", "category": "methodology"},
        "requirements": {"name": "requirements analysis", "depth": "intermediate", "category": "methodology"},
        "uml": {"name": "software design", "depth": "intermediate", "category": "methodology"},
        # Visualization
        "visualization": {"name": "data visualization", "depth": "intermediate", "category": "technical"},
        # Languages/PLs
        "compiler": {"name": "compilers", "depth": "intermediate", "category": "technical"},
        "interpreter": {"name": "compilers", "depth": "intermediate", "category": "technical"},
        "parsing": {"name": "compilers", "depth": "intermediate", "category": "technical"},
        "functional programming": {"name": "functional programming", "depth": "intermediate", "category": "technical"},
        # Game dev
        "game": {"name": "game development", "depth": "intermediate", "category": "technical"},
        "animation": {"name": "computer graphics", "depth": "intermediate", "category": "technical"},
        "rendering": {"name": "computer graphics", "depth": "intermediate", "category": "technical"},
    }

    # Find the raw course by matching course_number
    course_number_with_space = course_id[:3] + " " + course_id[3:]  # CSE2221 -> CSE 2221
    raw_course = None
    for c in raw_courses:
        cn = c.get("course_number", c.get("number", ""))
        if cn.replace(" ", "").upper() == course_id.upper():
            raw_course = c
            break

    if not raw_course:
        return []

    # Build a searchable text blob
    text_parts = [
        raw_course.get("course_title", raw_course.get("title", "")),
        raw_course.get("description", ""),
    ]
    los = raw_course.get("learning_outcomes", [])
    if isinstance(los, list):
        text_parts.extend(los)
    elif isinstance(los, str):
        text_parts.append(los)

    text_blob = " ".join(text_parts).lower()

    # Extract matching skills
    found: dict[str, dict] = {}
    for keyword, skill_info in SKILL_KEYWORDS.items():
        if keyword in text_blob:
            name = skill_info["name"]
            if name not in found or DEPTH_SCORES.get(skill_info["depth"], 0) > DEPTH_SCORES.get(found[name].get("depth", "introductory"), 0):
                found[name] = dict(skill_info)

    return list(found.values())


def compute_student_skills(completed_course_ids: list[str], fingerprints: dict, raw_courses: list | None = None) -> dict[str, float]:
    """
    Union all skills from completed courses.
    Falls back to keyword-based skill derivation when Watson fingerprints are empty.
    Returns: {skill_name: proficiency_score (0-1)}
    """
    student_skills: dict[str, float] = {}
    for cid in completed_course_ids:
        fp = fingerprints.get(cid, {})
        skills = fp.get("skills_taught", [])

        # If Watson fingerprinting returned no skills, derive from metadata
        if not skills and raw_courses:
            skills = _derive_skills_from_metadata(cid, raw_courses)

        for skill in skills:
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
    career_paths_dict = skill_index.get("career_paths", {})
    resolved_key = _resolve_career_key(career_path, career_paths_dict)
    career_data = career_paths_dict.get(resolved_key, {})
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

    # Load raw course data for fallback skill derivation
    raw_courses_path = Path(__file__).parent.parent.parent / "raw_data" / "osu_courses.json"
    raw_courses = []
    if raw_courses_path.exists():
        with open(raw_courses_path, "r", encoding="utf-8") as f:
            raw_courses = json.load(f)

    # Normalize input course IDs
    completed_ids = {normalize_course_id(c) for c in courses_taken}
    completed_ids_ordered = [normalize_course_id(c) for c in courses_taken]

    # Stage 3a: Student skill state (with fallback to metadata-derived skills)
    student_skills = compute_student_skills(list(completed_ids), fingerprints, raw_courses)

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
    critique_report = []
    was_refined = False
    refinement_summary = ""
    eligible_courses_json = json.dumps(
        [c for c in available_courses[:20] if c["prerequisites_met"]], indent=2
    )

    if skill_index and fingerprints:
        try:
            user_msg = PLAN_USER_PROMPT.format(
                student_name=student_name,
                completed_courses=json.dumps(completed_course_details, indent=2),
                current_skills_json=json.dumps(
                    sorted(student_skills.items(), key=lambda x: x[1], reverse=True)[:20], indent=2
                ),
                target_career=target_career,
                skill_gaps_json=json.dumps(skill_gaps[:15], indent=2),
                available_courses_json=eligible_courses_json,
            )
            raw = granite_generate(PLAN_SYSTEM_PROMPT, user_msg)
            parsed = parse_json_response(raw)
            plans = parsed.get("plans", [])
        except Exception as e:
            logger.error(f"Plan generation failed: {e}")
            plans = []

    # Stage 3e: Self-critique loop — Granite reviews its own plans
    if plans:
        try:
            time.sleep(2)
            critique_msg = CRITIQUE_USER_PROMPT.format(
                career_path=target_career,
                plans_json=json.dumps(plans, indent=2),
                available_courses_json=eligible_courses_json,
            )
            raw_critique = granite_generate(CRITIQUE_SYSTEM_PROMPT, critique_msg)
            critique_parsed = parse_json_response(raw_critique)
            critique_report = critique_parsed.get("critiques", [])
            logger.info(f"Critique report: {json.dumps(critique_report)}")

            # Check if any plan has critical issues
            has_critical = any(
                issue.get("severity") == "critical"
                for c in critique_report
                for issue in c.get("issues_found", [])
            )

            if has_critical:
                time.sleep(2)
                refinement_msg = REFINEMENT_USER_PROMPT.format(
                    plans_json=json.dumps(plans, indent=2),
                    critiques_json=json.dumps(critique_report, indent=2),
                    available_courses_json=eligible_courses_json,
                )
                raw_refined = granite_generate(REFINEMENT_SYSTEM_PROMPT, refinement_msg)
                refined_parsed = parse_json_response(raw_refined)
                refined_plans = refined_parsed.get("plans", [])

                if refined_plans:
                    plans = refined_plans
                    was_refined = True
                    fixes = []
                    for p in plans:
                        for fix in p.get("improvements_made", []):
                            fixes.append(fix)
                    refinement_summary = "; ".join(fixes[:4]) if fixes else "Issues corrected by AI self-review"
                    logger.info(f"Plans refined: {refinement_summary}")
        except Exception as e:
            logger.warning(f"Self-critique loop failed (using original plans): {e}")

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

    resolved_career_key = _resolve_career_key(target_career, skill_index.get("career_paths", {}))

    # Collect career-demanded skills per category (sum of demand_scores)
    career_cat_totals = {}
    career_cat_skills = {}  # track which skills belong to each category
    for skill in skill_index.get("career_paths", {}).get(resolved_career_key, {}).get("skills", [])[:60]:
        for cat, keywords in category_groups.items():
            if any(kw in skill["name"] for kw in keywords):
                career_cat_totals[cat] = career_cat_totals.get(cat, 0) + skill["demand_score"]
                career_cat_skills.setdefault(cat, set()).add(skill["name"])

    # Normalize career target: strongest category ≈ 85%, others scaled proportionally
    max_career_total = max(career_cat_totals.values()) if career_cat_totals else 1
    scale_factor = 85.0 / max_career_total if max_career_total > 0 else 1

    # Student coverage: what % of the career-demanded skills does the student have?
    student_cat_coverage = {}
    for cat, demanded_skills in career_cat_skills.items():
        covered = sum(1 for s in demanded_skills if student_skills.get(s, 0) > 0)
        student_cat_coverage[cat] = (covered / len(demanded_skills) * 100) if demanded_skills else 0

    radar_data = []
    for cat in category_groups:
        career_val = career_cat_totals.get(cat, 0) * scale_factor
        student_val = student_cat_coverage.get(cat, 0)
        radar_data.append({
            "category": cat,
            "career_target": round(min(career_val, 100), 1),
            "student_current": round(min(student_val, 100), 1),
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
        "critique_report": critique_report,
        "was_refined": was_refined,
        "refinement_summary": refinement_summary,
        "course_overlaps": relevant_overlaps,
        "top_skills_to_acquire": [g["name"] for g in skill_gaps[:8]],
        "pipeline_stats": {
            "job_postings_analyzed": si_metadata.get("total_postings_analyzed", 0),
            "courses_fingerprinted": len(fingerprints),
            "data_sources": "LinkedIn, Indeed, Glassdoor (job postings); syllabi.engineering.osu.edu (course data)",
            "model_used": "ibm/granite-4-h-small",
            "embedding_model": "ibm/granite-embedding-278m-multilingual",
        },
    }
