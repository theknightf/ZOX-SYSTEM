@echo off
REM ──────────────────────────────────────────────────────────────
REM  ZOX dev server launcher
REM  Uses the portable Node runtime; keeps running independently.
REM  Close the window that opens to STOP the server.
REM ──────────────────────────────────────────────────────────────
set NODE_DIR=%LOCALAPPDATA%\Temp\opencode\node22\node-v22.14.0-win-x64
set PATH=%NODE_DIR%;%PATH%
cd /d "C:\Users\HP\Desktop\ZOX-SYSTEM-main\ZOX-SYSTEM-main"
echo Starting ZOX on http://127.0.0.1:4028 ...
start "" http://127.0.0.1:4028/sign-up-login-screen
"%NODE_DIR%\npm.cmd" run dev
pause
