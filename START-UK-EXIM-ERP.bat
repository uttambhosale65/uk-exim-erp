@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\start-uk-exim-erp.ps1"
set "RUNNER_EXIT_CODE=%ERRORLEVEL%"
if not "%RUNNER_EXIT_CODE%"=="0" (
  echo.
  echo Startup failed. Diagnostic logs are preserved in the UK-EXIM-ERP runtime folder shown above.
  pause
)
exit /b %RUNNER_EXIT_CODE%
