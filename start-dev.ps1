# ============================================================
# start-dev.ps1 - Inicia Backend + Frontend do TCIP em dev
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
Write-Host "    TCIP - Ambiente de Desenvolvimento      " -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $BACKEND)) {
    Write-Host "ERRO: Pasta backend nao encontrada: $BACKEND" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $FRONTEND)) {
    Write-Host "ERRO: Pasta frontend nao encontrada: $FRONTEND" -ForegroundColor Red
    exit 1
}

$localIP = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notmatch "^(127\.|169\.)" } |
    Select-Object -First 1).IPAddress

Write-Host "IP: IP da maquina na rede local: $localIP" -ForegroundColor Yellow
Write-Host ""
Write-Host "MOBILE: Acesso por dispositivos externos:" -ForegroundColor Green
Write-Host "       Frontend: http://${localIP}:5173" -ForegroundColor Green
Write-Host "       API:      http://${localIP}:8000/api/" -ForegroundColor Green
Write-Host ""
Write-Host "PC: Acesso local:" -ForegroundColor Green
Write-Host "       Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "       API:      http://localhost:8000/api/" -ForegroundColor Green
Write-Host "       Admin:    http://localhost:8000/tcip-painel-restrito/" -ForegroundColor Green
Write-Host ""
Write-Host "INFO: O proxy do Vite redireciona /api/* -> Django automaticamente" -ForegroundColor DarkGray
Write-Host ""

Write-Host "DJANGO: Iniciando Django..." -ForegroundColor Cyan

if (Test-Path $VENV) {
    # Forma mais segura de concatenar comandos para a nova janela do PowerShell
    $djangoCmd = "cd '$BACKEND'; & '$VENV'; python manage.py runserver 0.0.0.0:8000"
} else {
    Write-Host "   (sem .venv detectado - usando Python do PATH)" -ForegroundColor DarkGray
    $djangoCmd = "cd '$BACKEND'; python manage.py runserver 0.0.0.0:8000"
}

$djangoProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", $djangoCmd -PassThru


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
    Write-Host "   AVISO: Django demorou mais que o esperado. Continuando mesmo assim..." -ForegroundColor Yellow
} else {
    Write-Host "   OK: Django disponivel!" -ForegroundColor Green
}

Write-Host ""
Write-Host "VITE: Iniciando Vite (Frontend)..." -ForegroundColor Cyan

$viteProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$FRONTEND'; npm run dev" -PassThru

Write-Host "   OK: Vite iniciado!" -ForegroundColor Green
Write-Host ""
Write-Host "Pressione ENTER nesta janela para encerrar" -ForegroundColor DarkGray
Read-Host

Write-Host ""
Write-Host "STOP: Encerrando servidores..." -ForegroundColor Yellow

if ($djangoProc -and !$djangoProc.HasExited) {
    Stop-Process -Id $djangoProc.Id -Force -ErrorAction SilentlyContinue
    Write-Host "   Django encerrado." -ForegroundColor DarkGray
}
if ($viteProc -and !$viteProc.HasExited) {
    Stop-Process -Id $viteProc.Id -Force -ErrorAction SilentlyContinue
    Write-Host "   Vite encerrado." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "OK: Ambiente encerrado. Ate logo!" -ForegroundColor Green
