# Get current directory path
$currentDir = $PSScriptRoot
if (-not $currentDir) { $currentDir = Get-Location }

# 1. Check if Node.js exists
$nodeCheck = Get-Command "node" -ErrorAction SilentlyContinue
if ($null -eq $nodeCheck) {
    Write-Host "Node.js not found. Installing Node.js silently..." -ForegroundColor Yellow
    
    # Install Node.js silently using winget
    winget install OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
    
    # Refresh PATH environment variable for the current session
    $env:Path += ";C:\Program Files\nodejs"
    
    $nodeCheckAgain = Get-Command "node" -ErrorAction SilentlyContinue
    if ($null -eq $nodeCheckAgain) {
        Write-Host "Error: Could not automatically install Node.js. Please download and install it manually from https://nodejs.org/" -ForegroundColor Red
        Exit
    } else {
        Write-Host "✓ Node.js installed successfully!" -ForegroundColor Green
    }
}

# 2. Run the setup-mcp script
$setupScriptPath = Join-Path $currentDir "build/setup-mcp.js"
node $setupScriptPath
