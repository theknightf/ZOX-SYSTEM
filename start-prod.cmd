@echo off
REM ──────────────────────────────────────────────────────────────
REM  ZOX PRODUCTION server — much faster than dev mode.
REM  Rebuilds once, then serves. Close the window to stop.
REM ──────────────────────────────────────────────────────────────
set NODE_DIR=%LOCALAPPDATA%\Temp\opencode\node22\node-v22.14.0-win-x64
set PATH=%NODE_DIR%;%PATH%
cd /d "C:\Users\HP\Desktop\ZOX-SYSTEM-main\ZOX-SYSTEM-main"
echo Building production bundle (one-time, ~1-2 min)...
"%NODE_DIR%\npm.cmd" run build || (pause & exit /b 1)
echo Serving on http://127.0.0.1:4028 ...
start "" http://127.0.0.1:4028/sign-up-login-screen
"%NODE_DIR%\npm.cmd" run start
pause
