# ============================================================
# start-dev.ps1 — Inicia Backend + Frontend do TCIP em dev
# ============================================================
# Uso: .\start-dev.ps1
# Ctrl+C encerra ambos os servidores automaticamente
# ============================================================

$ErrorActionPreference = "Stop"

$ROOT       = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND    = Join-Path $ROOT "backend"
$FRONTEND   = Join-Path $ROOT "cartorio_tcip_2"
$VENV       = Join-Path $BACKEND ".venv\Scripts\Activate.ps1"

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   TCIP — Ambiente de Desenvolvimento     ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Verificar pré-requisitos ──────────────────────────────────────────────────
if (-not (Test-Path $BACKEND)) {
    Write-Host "❌  Pasta backend não encontrada: $BACKEND" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $FRONTEND)) {
    Write-Host "❌  Pasta frontend não encontrada: $FRONTEND" -ForegroundColor Red
    exit 1
}

# ── Detectar IP local para mostrar URLs de acesso ────────────────────────────
$localIP = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notmatch "^(127\.|169\.)" } |
    Select-Object -First 1).IPAddress

Write-Host "🌐  IP da máquina na rede local: $localIP" -ForegroundColor Yellow
Write-Host ""
Write-Host "  📱  Acesso por dispositivos externos:" -ForegroundColor Green
Write-Host "       Frontend: http://${localIP}:5173" -ForegroundColor Green
Write-Host "       API:      http://${localIP}:8000/api/" -ForegroundColor Green
Write-Host ""
Write-Host "  💻  Acesso local:" -ForegroundColor Green
Write-Host "       Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "       API:      http://localhost:8000/api/" -ForegroundColor Green
Write-Host "       Admin:    http://localhost:8000/tcip-painel-restrito/" -ForegroundColor Green
Write-Host ""
Write-Host "  ℹ️   O proxy do Vite redireciona /api/* → Django automaticamente" -ForegroundColor DarkGray
Write-Host ""

# ── Iniciar Django ────────────────────────────────────────────────────────────
Write-Host "🐍  Iniciando Django..." -ForegroundColor Cyan

if (Test-Path $VENV) {
    $djangoCmd = "& '$VENV'; python manage.py runserver 0.0.0.0:8000"
} else {
    Write-Host "   (sem .venv detectado — usando Python do PATH)" -ForegroundColor DarkGray
    $djangoCmd = "python manage.py runserver 0.0.0.0:8000"
}

$djangoProc = Start-Process powershell -ArgumentList `
    "-NoExit", "-Command", "cd '$BACKEND'; $djangoCmd" `
    -PassThru

# ── Aguardar Django ficar disponível ─────────────────────────────────────────
Write-Host "   Aguardando Django em http://localhost:8000 ..." -ForegroundColor DarkGray
$retries = 0
do {
    Start-Sleep -Seconds 1
    $retries++
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:8000/api/" -TimeoutSec 2 -ErrorAction SilentlyContinue
        break
    } catch { }
} while ($retries -lt 15)

if ($retries -ge 15) {
    Write-Host "   ⚠️  Django demorou mais que o esperado. Continuando mesmo assim..." -ForegroundColor Yellow
} else {
    Write-Host "   ✅  Django disponível!" -ForegroundColor Green
}

# ── Iniciar Vite ──────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "⚡  Iniciando Vite (Frontend)..." -ForegroundColor Cyan

$viteProc = Start-Process powershell -ArgumentList `
    "-NoExit", "-Command", "cd '$FRONTEND'; npm run dev" `
    -PassThru

Write-Host "   ✅  Vite iniciado!" -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host " Pressione ENTER nesta janela para encerrar " -ForegroundColor DarkGray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Read-Host

# ── Encerrar ambos os processos ───────────────────────────────────────────────
Write-Host ""
Write-Host "🛑  Encerrando servidores..." -ForegroundColor Yellow

if ($djangoProc -and !$djangoProc.HasExited) {
    Stop-Process -Id $djangoProc.Id -Force -ErrorAction SilentlyContinue
    Write-Host "   Django encerrado." -ForegroundColor DarkGray
}
if ($viteProc -and !$viteProc.HasExited) {
    Stop-Process -Id $viteProc.Id -Force -ErrorAction SilentlyContinue
    Write-Host "   Vite encerrado." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "✅  Ambiente encerrado. Até logo!" -ForegroundColor Green
