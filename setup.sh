#!/bin/bash
set -e

echo "=== BuckeyePathfinder Setup ==="
echo ""

# Backend
echo "1. Setting up Python virtual environment..."
cd "$(dirname "$0")"
python3 -m venv venv
source venv/Scripts/activate 2>/dev/null || source venv/bin/activate
pip install -r backend/requirements.txt

echo ""
echo "2. Setting up frontend..."
cd frontend
npm install
cd ..

echo ""
echo "=== Setup complete! ==="
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Copy .env.example to .env and fill in your watsonx.ai credentials:"
echo "   cp .env.example .env"
echo ""
echo "2. Make sure your raw_data/ folder has:"
echo "   - raw_data/job_postings.json  (30+ real job postings)"
echo "   - raw_data/osu_courses.json   (35+ OSU courses with learning outcomes)"
echo "   - raw_data/course_reviews.json  (optional)"
echo ""
echo "3. Run the data pipeline ONCE:"
echo "   curl -X POST http://localhost:8000/api/run-pipeline"
echo ""
echo "4. Start the backend (in terminal 1):"
echo "   source venv/Scripts/activate  # Windows"
echo "   source venv/bin/activate      # Mac/Linux"
echo "   python -m uvicorn backend.main:app --reload --port 8000"
echo ""
echo "5. Start the frontend (in terminal 2):"
echo "   cd frontend && npm run dev"
echo ""
echo "6. Open http://localhost:5173"
