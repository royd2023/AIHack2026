#!/usr/bin/env bash
# =============================================================================
# BuckeyePathfinder — IBM Code Engine Deploy Script
# =============================================================================
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Requires:
#   - IBM Cloud CLI: https://cloud.ibm.com/docs/cli
#   - Plugins: ibmcloud plugin install code-engine container-registry
#   - .env file with WATSONX_API_KEY, WATSONX_PROJECT_ID, WATSONX_URL
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# CONFIG — edit these before running
# ---------------------------------------------------------------------------
IBM_API_KEY="${IBM_API_KEY:-}"          # IBM Cloud API key (or set WATSONX_API_KEY)
ICR_REGION="us.icr.io"                 # Container Registry region
ICR_NAMESPACE="buckeye-pathfinder"     # ICR namespace (will be created if missing)
CE_PROJECT="buckeye-pathfinder"        # Code Engine project name
CE_REGION="us-south"                   # IBM Cloud region
BACKEND_APP="backend"
FRONTEND_APP="frontend"

# Load .env for watsonx credentials
if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | xargs)
fi

# Validate required vars
: "${WATSONX_API_KEY:?Need WATSONX_API_KEY in .env or environment}"
: "${WATSONX_PROJECT_ID:?Need WATSONX_PROJECT_ID in .env or environment}"
WATSONX_URL="${WATSONX_URL:-https://us-south.ml.cloud.ibm.com}"

# Use WATSONX_API_KEY as IBM Cloud API key if IBM_API_KEY not set separately
IBM_API_KEY="${IBM_API_KEY:-$WATSONX_API_KEY}"

BACKEND_IMAGE="${ICR_REGION}/${ICR_NAMESPACE}/${BACKEND_APP}:latest"
FRONTEND_IMAGE="${ICR_REGION}/${ICR_NAMESPACE}/${FRONTEND_APP}:latest"

echo "================================================================="
echo " BuckeyePathfinder — IBM Code Engine Deploy"
echo "================================================================="

# ---------------------------------------------------------------------------
# 1. Log in to IBM Cloud
# ---------------------------------------------------------------------------
echo ""
echo "[1/7] Logging in to IBM Cloud..."
ibmcloud login --apikey "$IBM_API_KEY" -r "$CE_REGION" -q
ibmcloud cr login

# ---------------------------------------------------------------------------
# 2. Ensure ICR namespace exists
# ---------------------------------------------------------------------------
echo ""
echo "[2/7] Ensuring ICR namespace '${ICR_NAMESPACE}'..."
ibmcloud cr namespace-add "$ICR_NAMESPACE" 2>/dev/null || echo "  (namespace already exists)"

# ---------------------------------------------------------------------------
# 3. Build & push backend image
# ---------------------------------------------------------------------------
echo ""
echo "[3/7] Building & pushing backend image..."
docker build -f Dockerfile.backend -t "$BACKEND_IMAGE" .
docker push "$BACKEND_IMAGE"

# ---------------------------------------------------------------------------
# 4. Set up Code Engine project
# ---------------------------------------------------------------------------
echo ""
echo "[4/7] Setting up Code Engine project '${CE_PROJECT}'..."
if ! ibmcloud ce project get --name "$CE_PROJECT" &>/dev/null; then
  ibmcloud ce project create --name "$CE_PROJECT"
fi
ibmcloud ce project select --name "$CE_PROJECT"

# Create ICR registry secret if it doesn't exist
if ! ibmcloud ce secret get --name icr-secret &>/dev/null; then
  echo "  Creating ICR registry secret..."
  ibmcloud ce secret create-registry \
    --name icr-secret \
    --server "$ICR_REGION" \
    --username iamapikey \
    --password "$IBM_API_KEY"
fi

# ---------------------------------------------------------------------------
# 5. Deploy backend
# ---------------------------------------------------------------------------
echo ""
echo "[5/7] Deploying backend to Code Engine..."
if ibmcloud ce application get --name "$BACKEND_APP" &>/dev/null; then
  ibmcloud ce application update --name "$BACKEND_APP" \
    --image "$BACKEND_IMAGE" \
    --registry-secret icr-secret \
    --env WATSONX_API_KEY="$WATSONX_API_KEY" \
    --env WATSONX_PROJECT_ID="$WATSONX_PROJECT_ID" \
    --env WATSONX_URL="$WATSONX_URL"
else
  ibmcloud ce application create --name "$BACKEND_APP" \
    --image "$BACKEND_IMAGE" \
    --registry-secret icr-secret \
    --port 8000 \
    --min-scale 1 \
    --env WATSONX_API_KEY="$WATSONX_API_KEY" \
    --env WATSONX_PROJECT_ID="$WATSONX_PROJECT_ID" \
    --env WATSONX_URL="$WATSONX_URL"
fi

# Get backend URL
BACKEND_URL=$(ibmcloud ce application get --name "$BACKEND_APP" --output json | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d['status']['url'])" 2>/dev/null || \
  ibmcloud ce application get --name "$BACKEND_APP" | grep -Eo 'https://[^ ]+' | head -1)

echo "  Backend URL: ${BACKEND_URL}"

# Update backend CORS to allow the frontend (placeholder — updated after frontend deploy)
ibmcloud ce application update --name "$BACKEND_APP" \
  --env CORS_ORIGINS="http://localhost:5173,http://localhost:3000,https://${FRONTEND_APP}.${CE_REGION}.codeengine.appdomain.cloud"

# ---------------------------------------------------------------------------
# 6. Build & push frontend image (with backend URL for envsubst at runtime)
# ---------------------------------------------------------------------------
echo ""
echo "[6/7] Building & pushing frontend image..."
# VITE_API_URL is NOT needed since the frontend uses relative /api paths proxied by nginx.
# The backend URL is injected at runtime via BACKEND_URL env var (picked up by nginx envsubst).
docker build -f Dockerfile.frontend -t "$FRONTEND_IMAGE" .
docker push "$FRONTEND_IMAGE"

# ---------------------------------------------------------------------------
# 7. Deploy frontend
# ---------------------------------------------------------------------------
echo ""
echo "[7/7] Deploying frontend to Code Engine..."
# BACKEND_URL must end with / for nginx proxy_pass to work correctly
BACKEND_URL_SLASH="${BACKEND_URL%/}/"

if ibmcloud ce application get --name "$FRONTEND_APP" &>/dev/null; then
  ibmcloud ce application update --name "$FRONTEND_APP" \
    --image "$FRONTEND_IMAGE" \
    --registry-secret icr-secret \
    --env BACKEND_URL="$BACKEND_URL_SLASH"
else
  ibmcloud ce application create --name "$FRONTEND_APP" \
    --image "$FRONTEND_IMAGE" \
    --registry-secret icr-secret \
    --port 80 \
    --min-scale 1 \
    --env BACKEND_URL="$BACKEND_URL_SLASH"
fi

FRONTEND_URL=$(ibmcloud ce application get --name "$FRONTEND_APP" --output json | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d['status']['url'])" 2>/dev/null || \
  ibmcloud ce application get --name "$FRONTEND_APP" | grep -Eo 'https://[^ ]+' | head -1)

# Update backend CORS with the real frontend URL
ibmcloud ce application update --name "$BACKEND_APP" \
  --env CORS_ORIGINS="http://localhost:5173,http://localhost:3000,${FRONTEND_URL}"

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "================================================================="
echo " Deploy complete!"
echo "  Frontend : ${FRONTEND_URL}"
echo "  Backend  : ${BACKEND_URL}"
echo "================================================================="
