# SIG Backend - Script de inicialização
# Uso: .\start.ps1

Write-Host "Iniciando SIG Backend..." -ForegroundColor Cyan
Write-Host ""

# Verificar se está na pasta correta
if (-not (Test-Path "app\main.py")) {
    Write-Host "Erro: Execute este script da pasta backend\" -ForegroundColor Red
    exit 1
}

# Iniciar o servidor
python -m uvicorn app.main:app --reload --port 8000

