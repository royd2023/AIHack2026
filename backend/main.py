"""
BuckeyePathfinder — IBM watsonx.ai + Granite-powered Academic Path Optimizer
FastAPI application entry point.
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="BuckeyePathfinder API",
    description="AI Career Intelligence Platform powered by IBM Granite on watsonx.ai",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/")
async def root():
    return {
        "name": "BuckeyePathfinder",
        "description": "AI-powered academic planning aligned with your career",
        "powered_by": "IBM Granite on watsonx.ai",
        "models": {
            "text_generation": "ibm/granite-4-h-small",
            "embeddings": "ibm/granite-embedding-278m-multilingual",
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
