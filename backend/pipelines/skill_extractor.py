from __future__ import annotations
"""
PIPELINE STAGE 1: Skill Extraction from Real Job Postings

Reads raw_data/job_postings.json
Calls Granite for each posting to extract structured skills
Aggregates into backend/data/skill_index.json
"""

import json
import logging
import time
from collections import defaultdict
from pathlib import Path

from .watsonx_client import granite_generate, parse_json_response

logger = logging.getLogger(__name__)

RAW_DATA_DIR = Path(__file__).parent.parent.parent / "raw_data"
OUTPUT_DIR = Path(__file__).parent.parent / "data"

SKILL_EXTRACT_PROMPT = """You are a labor market analyst. Extract every technical skill, tool, framework, methodology, and soft skill from this job posting. Be specific — extract exact technology names (e.g., 'React' not 'frontend framework', 'PostgreSQL' not 'database'). Respond ONLY with valid JSON, no markdown, no backticks.

Format: {{ "skills": [{{ "name": "lowercase_skill_name", "category": "technical|tool|framework|methodology|soft_skill", "importance": "required|preferred|bonus" }}] }}

JOB POSTING:
Title: {title}
Company: {company}
{description}"""


IMPORTANCE_SCORES = {"required": 1.0, "preferred": 0.66, "bonus": 0.33}


def extract_skills_from_posting(posting: dict) -> list[dict]:
    """Call Granite to extract skills from a single job posting."""
    prompt = SKILL_EXTRACT_PROMPT.format(
        title=posting.get("title", ""),
        company=posting.get("company", ""),
        description=posting.get("description", "")[:3000],  # Cap to avoid token overflow
    )
    try:
        raw = granite_generate(prompt)
        parsed = parse_json_response(raw)
        skills = parsed.get("skills", []) if isinstance(parsed, dict) else []
        # Normalize skill names to lowercase
        for s in skills:
            s["name"] = s.get("name", "").lower().strip()
        return [s for s in skills if s.get("name")]
    except Exception as e:
        logger.error(f"Failed to extract skills from {posting.get('id', '?')}: {e}")
        return []


def run_skill_extraction() -> dict:
    """Main entry point — reads job postings, runs Granite, writes skill_index.json."""
    input_path = RAW_DATA_DIR / "job_postings.json"
    if not input_path.exists():
        logger.warning(f"No job_postings.json found at {input_path}. Skipping Stage 1.")
        return {}

    with open(input_path, "r", encoding="utf-8") as f:
        postings = json.load(f)

    logger.info(f"Stage 1: Processing {len(postings)} real job postings with IBM Granite...")

    # Group by career path
    by_career: dict[str, list] = defaultdict(list)
    for p in postings:
        career = p.get("career_path", "unknown")
        by_career[career].append(p)

    career_skill_data: dict[str, dict] = {}

    for career_path, career_postings in by_career.items():
        logger.info(f"  → {career_path}: {len(career_postings)} postings")

        # Skill accumulator: skill_name → {count, total_importance, companies, category}
        skill_agg: dict[str, dict] = defaultdict(lambda: {
            "count": 0,
            "total_importance": 0.0,
            "companies": set(),
            "category": "technical",
            "co_skills": defaultdict(int),
        })

        for i, posting in enumerate(career_postings):
            logger.info(f"    Posting {i + 1}/{len(career_postings)}: {posting.get('title', '?')} @ {posting.get('company', '?')}")
            skills = extract_skills_from_posting(posting)

            skill_names_in_posting = [s["name"] for s in skills]

            for skill in skills:
                name = skill["name"]
                importance = IMPORTANCE_SCORES.get(skill.get("importance", "preferred"), 0.66)
                skill_agg[name]["count"] += 1
                skill_agg[name]["total_importance"] += importance
                skill_agg[name]["category"] = skill.get("category", "technical")
                company = posting.get("company", "")
                if company:
                    skill_agg[name]["companies"].add(company)
                # Track co-occurrence
                for other in skill_names_in_posting:
                    if other != name:
                        skill_agg[name]["co_skills"][other] += 1

            # Rate limiting
            if i < len(career_postings) - 1:
                time.sleep(1)

        total = len(career_postings)
        skills_ranked = []
        for skill_name, data in skill_agg.items():
            demand_score = round(data["count"] / total, 4)
            avg_importance = round(data["total_importance"] / data["count"], 4) if data["count"] > 0 else 0
            top_co = sorted(data["co_skills"].items(), key=lambda x: x[1], reverse=True)[:5]
            skills_ranked.append({
                "name": skill_name,
                "demand_score": demand_score,
                "avg_importance": avg_importance,
                "category": data["category"],
                "co_occurring_skills": [k for k, _ in top_co],
                "sample_companies": list(data["companies"])[:5],
            })

        # Sort by demand_score × avg_importance
        skills_ranked.sort(key=lambda x: x["demand_score"] * x["avg_importance"], reverse=True)
        career_skill_data[career_path] = {
            "skills": skills_ranked,
            "total_postings_analyzed": total,
        }

    # Build co-occurrence matrix (top pairs only)
    co_matrix = {}
    for career, data in career_skill_data.items():
        for skill in data["skills"]:
            name = skill["name"]
            for co in skill.get("co_occurring_skills", []):
                pair_key = "|".join(sorted([name, co]))
                co_matrix[pair_key] = co_matrix.get(pair_key, 0) + 1

    output = {
        "metadata": {
            "total_postings_analyzed": len(postings),
            "sources": "LinkedIn, Indeed, Glassdoor — real postings",
            "date_collected": "2026-02-27",
            "model_used": "ibm/granite-4-h-small",
        },
        "career_paths": career_skill_data,
        "skill_co_occurrence_matrix": co_matrix,
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / "skill_index.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    logger.info(f"Stage 1 complete. Skill index written to {output_path}")
    return output


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_skill_extraction()
