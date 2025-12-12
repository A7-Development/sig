# SIG Frontend - Script de inicialização
# Uso: .\start.ps1

Write-Host "Iniciando SIG Frontend..." -ForegroundColor Cyan
Write-Host ""

# Verificar se está na pasta correta
if (-not (Test-Path "package.json")) {
    Write-Host "Erro: Execute este script da pasta frontend\" -ForegroundColor Red
    exit 1
}

# Iniciar o servidor
npm run dev

