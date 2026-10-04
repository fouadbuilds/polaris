@echo off
setlocal
cd /d "%~dp0"
set "GIT_BASH=%ProgramFiles%\Git\bin\bash.exe"
if not exist "%GIT_BASH%" set "GIT_BASH=%ProgramFiles(x86)%\Git\bin\bash.exe"
if not exist "%GIT_BASH%" (
  echo Polaris needs Git Bash for Windows one-click startup.
  echo Install Git for Windows, then double-click this file again.
  pause
  exit /b 1
)
"%GIT_BASH%" "%~dp0Start Polaris.sh" %*
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
  echo.
  echo Polaris could not start. See the message above.
  pause
)
exit /b %EXIT_CODE%
