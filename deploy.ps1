# =============================================================================
# BuckeyePathfinder - IBM Code Engine Deploy Script (PowerShell)
# =============================================================================
# Usage (from project root in PowerShell):
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\deploy.ps1
# =============================================================================

$ErrorActionPreference = "Continue"

# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------
$ICR_REGION    = "us.icr.io"
$ICR_NAMESPACE = "buckeye-pathfinder"
$CE_PROJECT    = "buckeye-pathfinder"
$CE_REGION     = "us-south"
$BACKEND_APP   = "backend"
$FRONTEND_APP  = "frontend"

# ---------------------------------------------------------------------------
# Load .env
# ---------------------------------------------------------------------------
if (!(Test-Path ".env")) { Write-Error ".env file not found. Run from project root."; exit 1 }

Get-Content ".env" | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.+)$') {
        [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
    }
}

$WATSONX_API_KEY    = $env:WATSONX_API_KEY
$WATSONX_PROJECT_ID = $env:WATSONX_PROJECT_ID
$WATSONX_URL        = if ($env:WATSONX_URL) { $env:WATSONX_URL } else { "https://us-south.ml.cloud.ibm.com" }
$IBM_API_KEY        = $WATSONX_API_KEY

if (!$WATSONX_API_KEY)    { Write-Error "WATSONX_API_KEY missing from .env"; exit 1 }
if (!$WATSONX_PROJECT_ID) { Write-Error "WATSONX_PROJECT_ID missing from .env"; exit 1 }

$BACKEND_IMAGE  = "${ICR_REGION}/${ICR_NAMESPACE}/${BACKEND_APP}:latest"
$FRONTEND_IMAGE = "${ICR_REGION}/${ICR_NAMESPACE}/${FRONTEND_APP}:latest"

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " BuckeyePathfinder - IBM Code Engine Deploy" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# ---------------------------------------------------------------------------
# 1. Fix Docker context + Log in to IBM Cloud + Container Registry
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "[1/7] Logging in to IBM Cloud..." -ForegroundColor Yellow

# Switch Docker to the correct context for Docker Desktop on Windows
docker context use desktop-linux 2>&1 | Out-Null

ibmcloud login --apikey $IBM_API_KEY -r $CE_REGION -g Default -q
ibmcloud cr login
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to log in to IBM Container Registry"; exit 1 }

# ---------------------------------------------------------------------------
# 2. Ensure ICR namespace exists
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "[2/7] Ensuring ICR namespace '$ICR_NAMESPACE'..." -ForegroundColor Yellow
ibmcloud cr namespace-add $ICR_NAMESPACE 2>&1 | Out-Null
Write-Host "  Done."

# ---------------------------------------------------------------------------
# 3. Build and push backend image
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "[3/7] Building and pushing backend image..." -ForegroundColor Yellow
docker build -f Dockerfile.backend -t $BACKEND_IMAGE .
if ($LASTEXITCODE -ne 0) { Write-Error "Docker build failed for backend"; exit 1 }
docker push $BACKEND_IMAGE
if ($LASTEXITCODE -ne 0) { Write-Error "Docker push failed for backend"; exit 1 }

# ---------------------------------------------------------------------------
# 4. Set up Code Engine project
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "[4/7] Setting up Code Engine project '$CE_PROJECT'..." -ForegroundColor Yellow
ibmcloud ce project get --name $CE_PROJECT 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    ibmcloud ce project create --name $CE_PROJECT
}
ibmcloud ce project select --name $CE_PROJECT

# Create ICR registry secret if missing (correct command: ibmcloud ce registry create)
ibmcloud ce registry get --name icr-secret 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Creating ICR registry secret..."
    ibmcloud ce registry create `
        --name icr-secret `
        --server $ICR_REGION `
        --username iamapikey `
        --password $IBM_API_KEY
}

# ---------------------------------------------------------------------------
# 5. Deploy backend
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "[5/7] Deploying backend..." -ForegroundColor Yellow
ibmcloud ce application get --name $BACKEND_APP 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    ibmcloud ce application update --name $BACKEND_APP `
        --image $BACKEND_IMAGE `
        --registry-secret icr-secret `
        --env WATSONX_API_KEY=$WATSONX_API_KEY `
        --env WATSONX_PROJECT_ID=$WATSONX_PROJECT_ID `
        --env WATSONX_URL=$WATSONX_URL
} else {
    ibmcloud ce application create --name $BACKEND_APP `
        --image $BACKEND_IMAGE `
        --registry-secret icr-secret `
        --port 8000 `
        --min-scale 1 `
        --env WATSONX_API_KEY=$WATSONX_API_KEY `
        --env WATSONX_PROJECT_ID=$WATSONX_PROJECT_ID `
        --env WATSONX_URL=$WATSONX_URL
}
if ($LASTEXITCODE -ne 0) { Write-Error "Backend deploy failed"; exit 1 }

# Get backend URL
$BACKEND_URL = (ibmcloud ce application get --name $BACKEND_APP 2>&1 | Select-String "https://") -replace '.*?(https://\S+).*','$1'
Write-Host "  Backend URL: $BACKEND_URL" -ForegroundColor Green

# Update CORS with placeholder frontend URL
$PLACEHOLDER_FRONTEND = "https://${FRONTEND_APP}.${CE_REGION}.codeengine.appdomain.cloud"
ibmcloud ce application update --name $BACKEND_APP `
    --env CORS_ORIGINS="http://localhost:5173,http://localhost:3000,$PLACEHOLDER_FRONTEND" 2>&1 | Out-Null

# ---------------------------------------------------------------------------
# 6. Build and push frontend image
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "[6/7] Building and pushing frontend image..." -ForegroundColor Yellow
docker build -f Dockerfile.frontend -t $FRONTEND_IMAGE .
if ($LASTEXITCODE -ne 0) { Write-Error "Docker build failed for frontend"; exit 1 }
docker push $FRONTEND_IMAGE
if ($LASTEXITCODE -ne 0) { Write-Error "Docker push failed for frontend"; exit 1 }

# ---------------------------------------------------------------------------
# 7. Deploy frontend
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "[7/7] Deploying frontend..." -ForegroundColor Yellow
$BACKEND_URL_SLASH = $BACKEND_URL.TrimEnd("/") + "/"

ibmcloud ce application get --name $FRONTEND_APP 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    ibmcloud ce application update --name $FRONTEND_APP `
        --image $FRONTEND_IMAGE `
        --registry-secret icr-secret `
        --env BACKEND_URL=$BACKEND_URL_SLASH
} else {
    ibmcloud ce application create --name $FRONTEND_APP `
        --image $FRONTEND_IMAGE `
        --registry-secret icr-secret `
        --port 80 `
        --min-scale 1 `
        --env BACKEND_URL=$BACKEND_URL_SLASH
}
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend deploy failed"; exit 1 }

$FRONTEND_URL = (ibmcloud ce application get --name $FRONTEND_APP 2>&1 | Select-String "https://") -replace '.*?(https://\S+).*','$1'

# Update backend CORS with the real frontend URL
ibmcloud ce application update --name $BACKEND_APP `
    --env CORS_ORIGINS="http://localhost:5173,http://localhost:3000,$FRONTEND_URL" 2>&1 | Out-Null

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=================================================================" -ForegroundColor Green
Write-Host " Deploy complete!" -ForegroundColor Green
Write-Host "  Frontend : $FRONTEND_URL" -ForegroundColor Green
Write-Host "  Backend  : $BACKEND_URL" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
