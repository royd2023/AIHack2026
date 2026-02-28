from __future__ import annotations
"""
FastAPI routes for BuckeyePathfinder API.
"""

import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()

DATA_DIR = Path(__file__).parent.parent / "data"
RAW_DATA_DIR = Path(__file__).parent.parent.parent / "raw_data"

# Pipeline run status (in-memory, fine for hackathon)
pipeline_status = {
    "running": False,
    "stage": "",
    "done": False,
    "error": "",
}


class AnalyzeRequest(BaseModel):
    courses_taken: list[str]
    target_career: str
    name: str = "Student"


class PipelineRequest(BaseModel):
    run_stage1: bool = True
    run_stage2: bool = True


def load_json_safe(path: Path) -> dict | list | None:
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@router.post("/analyze")
async def analyze_student(req: AnalyzeRequest):
    """
    Main endpoint: takes student's courses + target career.
    Returns gap analysis and 3 optimized plans from Granite.
    """
    from backend.pipelines.gap_analyzer import analyze_gap

    if not req.courses_taken:
        raise HTTPException(status_code=400, detail="courses_taken cannot be empty")

    valid_careers = ["software_engineer", "data_scientist", "product_manager"]
    if req.target_career not in valid_careers:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid career. Valid options: {valid_careers}",
        )

    try:
        result = analyze_gap(
            courses_taken=req.courses_taken,
            target_career=req.target_career,
            student_name=req.name,
        )
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/careers")
async def get_careers():
    return {
        "careers": [
            {
                "id": "software_engineer",
                "label": "Software Engineer",
                "emoji": "🖥️",
                "description": "Build applications, systems, and infrastructure",
            },
            {
                "id": "data_scientist",
                "label": "Data Scientist",
                "emoji": "📊",
                "description": "Analyze data, build ML models, drive insights",
            },
            {
                "id": "product_manager",
                "label": "Product Manager",
                "emoji": "📋",
                "description": "Lead products from ideation to launch",
            },
        ]
    }


@router.get("/courses")
async def get_courses():
    """Return real course catalog from processed fingerprints."""
    fp_data = load_json_safe(DATA_DIR / "course_fingerprints.json")
    if fp_data and "courses" in fp_data:
        courses = []
        for cid, fp in fp_data["courses"].items():
            courses.append({
                "id": cid,
                "number": fp.get("number", cid),
                "title": fp.get("title", ""),
                "credits": fp.get("credits", 3),
                "prerequisites": fp.get("prerequisites", []),
                "career_relevance": fp.get("career_relevance", {}),
            })
        courses.sort(key=lambda x: x["number"])
        return {"courses": courses, "total": len(courses)}

    # Fallback: raw data
    raw = load_json_safe(RAW_DATA_DIR / "osu_courses.json")
    if raw:
        return {
            "courses": [
                {
                    "id": c.get("course_number", c.get("number", "")).replace(" ", ""),
                    "number": c.get("course_number", c.get("number", "")),
                    "title": c.get("course_title", c.get("title", "")),
                    "credits": c.get("credit_hours", c.get("credits", "3")),
                    "prerequisites": c.get("prerequisites", []),
                }
                for c in raw
            ],
            "total": len(raw),
        }

    raise HTTPException(status_code=404, detail="Course data not found. Run /api/run-pipeline first.")


@router.get("/skill-index")
async def get_skill_index():
    """Return computed skill demand data."""
    data = load_json_safe(DATA_DIR / "skill_index.json")
    if not data:
        raise HTTPException(status_code=404, detail="Skill index not found. Run /api/run-pipeline first.")
    return data


@router.post("/run-pipeline")
async def run_pipeline(req: PipelineRequest, background_tasks: BackgroundTasks):
    """
    Triggers Stage 1 and/or Stage 2 data processing pipelines.
    Long-running — runs in background.
    """
    if pipeline_status["running"]:
        return {"status": "already_running", "stage": pipeline_status["stage"]}

    async def _run():
        pipeline_status["running"] = True
        pipeline_status["done"] = False
        pipeline_status["error"] = ""
        try:
            if req.run_stage1:
                pipeline_status["stage"] = "stage1_skill_extraction"
                logger.info("Starting Stage 1: Skill Extraction...")
                from backend.pipelines.skill_extractor import run_skill_extraction
                run_skill_extraction()

            if req.run_stage2:
                pipeline_status["stage"] = "stage2_course_fingerprinting"
                logger.info("Starting Stage 2: Course Fingerprinting...")
                from backend.pipelines.course_fingerprinter import run_course_fingerprinting
                run_course_fingerprinting()

            pipeline_status["stage"] = "complete"
            pipeline_status["done"] = True
        except Exception as e:
            pipeline_status["error"] = str(e)
            logger.error(f"Pipeline failed: {e}", exc_info=True)
        finally:
            pipeline_status["running"] = False

    background_tasks.add_task(_run)
    return {"status": "started", "message": "Pipeline running in background. Poll /api/pipeline-status."}


@router.get("/pipeline-status")
async def get_pipeline_status():
    return pipeline_status
