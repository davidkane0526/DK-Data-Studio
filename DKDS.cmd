@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\windows\dkds-tools.ps1" %*
exit /b %errorlevel%
