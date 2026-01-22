@echo off
echo Installing ModScan Pro Service on Windows...
echo ============================================

WHERE node >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
  echo Error: Node.js is not installed.
  echo Please install Node.js from https://nodejs.org/
  pause
  exit /b
)

echo Rebuilding native modules for Windows...
call npm install --production --no-save

echo.
echo ============================================
echo To install as a Windows Service, we recommend using 'nssm'
echo (Non-Sucking Service Manager) or 'WinSW'.
echo.
echo AUTOMATED INSTALLATION (Requires nssm.exe in PATH):
echo.
echo nssm install ModScan "%CD%\server.js"
echo nssm set ModScan AppDirectory "%CD%"
echo nssm start ModScan
echo.
echo OR Manual:
echo 1. Open Task Scheduler
echo 2. Create Basic Task -> "Start a Program"
echo 3. Program: node.exe
echo 4. Arguments: "%CD%\server.js"
echo 5. Trigger: At System Startup
echo ============================================
pause
