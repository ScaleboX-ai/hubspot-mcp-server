#!/bin/bash
clear
echo "==================================================="
echo "  HubSpot MCP Setup Wizard"
echo "==================================================="
echo ""

# 1. Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "ERROR: Node.js was not found on your computer."
    echo "Opening https://nodejs.org/ to download..."
    if [ "$(uname)" == "Darwin" ]; then
        open "https://nodejs.org/"
    fi
    exit 1
fi

# 2. Run setup script directly
node "$(dirname "$0")/build/setup-mcp.js"
