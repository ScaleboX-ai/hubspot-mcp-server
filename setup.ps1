# Инициализация путей
$currentDir = $PSScriptRoot
if (-not $currentDir) { $currentDir = Get-Location }

# 1. Проверка наличия Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js не найден. Устанавливаем Node.js в фоновом режиме..." -ForegroundColor Yellow
    
    # Установка через стандартный установщик Windows winget
    winget install OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
    
    # Обновление путей текущей сессии
    $env:Path += ";C:\Program Files\nodejs"
    
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "Ошибка: Не удалось автоматически установить Node.js. Пожалуйста, установите его вручную с https://nodejs.org/" -ForegroundColor Red
        Exit
    } else {
        Write-Host "✓ Node.js успешно установлен!" -ForegroundColor Green
    }
}

# 2. Передаем управление кроссплатформенному скрипту настройки
node (Join-Path $currentDir "build/setup-mcp.js")
