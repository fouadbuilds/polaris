@echo off
rem DONT TOUCH - working Windows starter. Keep the direct Python launch path.
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%PATH%"
if not exist "backend\.venv\Scripts\python.exe" (
  echo Polaris needs its initial setup. Follow the Windows setup in README.md.
  pause
  exit /b 1
)
"backend\.venv\Scripts\python.exe" "scripts\launch.py" %*
set "POLARIS_EXIT_CODE=%ERRORLEVEL%"
if not "%POLARIS_EXIT_CODE%"=="0" (
  echo.
  echo Polaris could not start. See the message above.
  pause
)
exit /b %POLARIS_EXIT_CODE%
