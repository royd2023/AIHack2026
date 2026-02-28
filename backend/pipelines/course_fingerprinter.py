from __future__ import annotations
"""
PIPELINE STAGE 2: Course Fingerprinting from Real OSU Syllabi

Reads raw_data/osu_courses.json (and optionally course_reviews.json)
Calls Granite LLM to extract skills taught per course
Calls Granite Embeddings to generate course vectors
Computes course similarity matrix
Writes backend/data/course_fingerprints.json
"""

import json
import logging
import math
import time
from pathlib import Path

from .watsonx_client import granite_generate, granite_embed, parse_json_response

logger = logging.getLogger(__name__)

RAW_DATA_DIR = Path(__file__).parent.parent.parent / "raw_data"
OUTPUT_DIR = Path(__file__).parent.parent / "data"

COURSE_FINGERPRINT_PROMPT = """You are a university curriculum analyst. Analyze this OSU course and extract the specific, concrete skills a student would learn.

Cross-reference against these in-demand industry skills when naming skills: {top_skills}

Respond ONLY with valid JSON, no markdown, no backticks.

Format: {{
  "skills_taught": [{{"name": "lowercase_skill_name", "depth": "introductory|intermediate|advanced", "category": "technical|tool|framework|methodology|soft_skill"}}],
  "key_topics": ["topic1", "topic2", "topic3"],
  "career_relevance": {{"software_engineer": 0.0, "data_scientist": 0.0, "product_manager": 0.0}}
}}

COURSE:
Number: {number}
Title: {title}
Description: {description}
Learning Outcomes: {learning_outcomes}"""

REVIEW_INSIGHT_PROMPT = """Based on these student reviews for {course_number} - {course_title}, what specific skills do students ACTUALLY report gaining? Note any gaps between syllabus claims and actual learning.

Respond with 2-3 sentences summarizing real learning outcomes.

REVIEWS:
{reviews}"""


def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x ** 2 for x in a))
    mag_b = math.sqrt(sum(x ** 2 for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def get_top_skills_str(skill_index: dict, n: int = 30) -> str:
    """Extract top N skills across all career paths for injection into prompts."""
    all_skills = {}
    for career_data in skill_index.get("career_paths", {}).values():
        for skill in career_data.get("skills", []):
            name = skill["name"]
            score = skill.get("demand_score", 0) * skill.get("avg_importance", 1)
            all_skills[name] = max(all_skills.get(name, 0), score)
    sorted_skills = sorted(all_skills.items(), key=lambda x: x[1], reverse=True)
    return ", ".join(s[0] for s in sorted_skills[:n])


def fingerprint_course(course: dict, top_skills_str: str, reviews: list[dict] | None = None) -> dict:
    """Fingerprint a single course via Granite."""
    prompt = COURSE_FINGERPRINT_PROMPT.format(
        top_skills=top_skills_str,
        number=course.get("course_number", course.get("number", course.get("id", ""))),
        title=course.get("course_title", course.get("title", "")),
        description=course.get("description", "")[:800],
        learning_outcomes=course.get("learning_outcomes", "")[:1500],
    )

    try:
        raw = granite_generate(prompt)
        parsed = parse_json_response(raw)
    except Exception as e:
        logger.error(f"Failed to fingerprint {course.get('number', '?')}: {e}")
        parsed = {"skills_taught": [], "key_topics": [], "career_relevance": {}}

    # Normalize skill names
    for s in parsed.get("skills_taught", []):
        s["name"] = s.get("name", "").lower().strip()

    # Optional: review insights
    review_insights = ""
    if reviews:
        review_texts = "\n---\n".join(
            f"Rating {r.get('rating', '?')}: {r.get('review', '')}" for r in reviews[:5]
        )
        try:
            time.sleep(0.5)
            review_insights = granite_generate(REVIEW_INSIGHT_PROMPT.format(
                course_number=course.get("number", ""),
                course_title=course.get("title", ""),
                reviews=review_texts[:2000],
            ))
        except Exception as e:
            logger.warning(f"Review insight failed for {course.get('number', '?')}: {e}")

    return {
        "number": course.get("course_number", course.get("number", course.get("id", ""))),
        "title": course.get("course_title", course.get("title", "")),
        "credits": course.get("credit_hours", course.get("credits", 3)),
        "prerequisites": course.get("prerequisites", []),
        "corequisites": course.get("corequisites", []),
        "skills_taught": parsed.get("skills_taught", []),
        "key_topics": parsed.get("key_topics", []),
        "career_relevance": parsed.get("career_relevance", {}),
        "review_insights": review_insights,
        "embedding": [],  # Filled in second pass
    }


def run_course_fingerprinting() -> dict:
    """Main entry point."""
    courses_path = RAW_DATA_DIR / "osu_courses.json"
    reviews_path = RAW_DATA_DIR / "course_reviews.json"
    skill_index_path = OUTPUT_DIR / "skill_index.json"

    if not courses_path.exists():
        logger.warning(f"No osu_courses.json found at {courses_path}. Skipping Stage 2.")
        return {}

    with open(courses_path, "r", encoding="utf-8") as f:
        courses = json.load(f)

    # Load skill index for skill normalization
    top_skills_str = ""
    if skill_index_path.exists():
        with open(skill_index_path, "r", encoding="utf-8") as f:
            skill_index = json.load(f)
        top_skills_str = get_top_skills_str(skill_index)
        logger.info(f"Injecting top skills into course prompts: {top_skills_str[:100]}...")
    else:
        logger.warning("Skill index not found — course prompts will not have industry skill context.")

    # Load reviews if available
    reviews_by_course: dict[str, list] = {}
    if reviews_path.exists():
        with open(reviews_path, "r", encoding="utf-8") as f:
            reviews_raw = json.load(f)
        for r in reviews_raw:
            course_key = r.get("course", "")
            reviews_by_course.setdefault(course_key, []).append(r)
        logger.info(f"Loaded reviews for {len(reviews_by_course)} courses.")

    logger.info(f"Stage 2: Fingerprinting {len(courses)} OSU courses with IBM Granite...")

    fingerprints: dict[str, dict] = {}

    for i, course in enumerate(courses):
        course_id = course.get("course_number", course.get("id", course.get("number", f"course_{i}"))).replace(" ", "")
        course_number = course.get("course_number", course.get("number", course_id))

        logger.info(f"  {i + 1}/{len(courses)}: {course_number} — {course.get('course_title', course.get('title', '?'))}")

        course_reviews = reviews_by_course.get(course_number, []) or reviews_by_course.get(course_id, [])
        fp = fingerprint_course(course, top_skills_str, course_reviews if course_reviews else None)
        fingerprints[course_id] = fp

        if i < len(courses) - 1:
            time.sleep(1)

    # === Embedding pass ===
    logger.info("Generating Granite embeddings for all courses...")
    course_ids = list(fingerprints.keys())
    embed_texts = []
    for cid in course_ids:
        fp = fingerprints[cid]
        skills_str = " ".join(s["name"] for s in fp.get("skills_taught", []))
        topics_str = " ".join(fp.get("key_topics", []))
        embed_texts.append(f"{fp['title']} {skills_str} {topics_str}")

    # Batch by 8
    batch_size = 8
    all_embeddings = []
    for batch_start in range(0, len(embed_texts), batch_size):
        batch = embed_texts[batch_start:batch_start + batch_size]
        logger.info(f"  Embedding batch {batch_start // batch_size + 1}/{math.ceil(len(embed_texts) / batch_size)}")
        try:
            vecs = granite_embed(batch)
            all_embeddings.extend(vecs)
        except Exception as e:
            logger.error(f"Embedding batch failed: {e}")
            all_embeddings.extend([[] for _ in batch])
        time.sleep(0.5)

    for cid, embedding in zip(course_ids, all_embeddings):
        fingerprints[cid]["embedding"] = embedding

    # === Similarity matrix ===
    logger.info("Computing course similarity matrix...")
    similarity_pairs = []
    ids_with_embeds = [cid for cid in course_ids if fingerprints[cid]["embedding"]]

    for i, cid_a in enumerate(ids_with_embeds):
        for cid_b in ids_with_embeds[i + 1:]:
            sim = cosine_similarity(fingerprints[cid_a]["embedding"], fingerprints[cid_b]["embedding"])
            if sim > 0.65:
                # Find overlapping skills
                skills_a = {s["name"] for s in fingerprints[cid_a].get("skills_taught", [])}
                skills_b = {s["name"] for s in fingerprints[cid_b].get("skills_taught", [])}
                overlap = list(skills_a & skills_b)[:5]
                similarity_pairs.append({
                    "course_a": cid_a,
                    "course_b": cid_b,
                    "similarity": round(sim, 4),
                    "overlapping_skills": overlap,
                })

    similarity_pairs.sort(key=lambda x: x["similarity"], reverse=True)

    output = {
        "metadata": {
            "courses_analyzed": len(courses),
            "source": "syllabi.engineering.osu.edu — official OSU syllabi",
            "model_used": "ibm/granite-4-h-small",
            "embedding_model": "ibm/granite-embedding-278m-multilingual",
        },
        "courses": fingerprints,
        "course_similarity_pairs": similarity_pairs[:50],  # Top 50 pairs
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / "course_fingerprints.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    logger.info(f"Stage 2 complete. Fingerprints written to {output_path}")
    logger.info(f"Found {len(similarity_pairs)} high-overlap course pairs (>0.65 similarity).")
    return output


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_course_fingerprinting()
