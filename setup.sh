#!/bin/bash

# Clear terminal screen
clear

echo "====================================================="
echo "  Настройка HubSpot MCP сервера для macOS / Linux    "
echo "====================================================="
echo ""

# 1. Проверка наличия Node.js
if ! command -v node &> /dev/null
then
    echo "Node.js не найден. Попробуем установить..."
    
    if command -v brew &> /dev/null
    then
        echo "Устанавливаем Node.js через Homebrew..."
        brew install node
    else
        echo "Homebrew не найден. Пожалуйста, скачайте и установите Node.js вручную:"
        echo "👉 https://nodejs.org/"
        echo ""
        
        # Открыть сайт в браузере на macOS
        if [ "$(uname)" == "Darwin" ]; then
            open "https://nodejs.org/"
        fi
        exit 1
    fi
else
    echo "✓ Node.js уже установлен на вашем компьютере."
fi

# 2. Запуск кроссплатформенного скрипта настройки
node "$(dirname "$0")/build/setup-mcp.js"

echo ""
echo "Нажмите Enter для выхода..."
read
