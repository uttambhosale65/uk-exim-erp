@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\stop-uk-exim-erp.ps1"
set "RUNNER_EXIT_CODE=%ERRORLEVEL%"
echo.
pause
exit /b %RUNNER_EXIT_CODE%
