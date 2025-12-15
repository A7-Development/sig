# SIG - Script de inicialização do Backend
# Uso: .\start.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SIG - Sistema Integrado de Gestão    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Iniciar Backend
Write-Host "Iniciando Backend (porta 8000)..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\backend"
python -m uvicorn app.main:app --reload --port 8000
