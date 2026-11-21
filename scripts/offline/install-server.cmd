@echo off
REM Atajo para instalación en servidor sin internet
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-server.ps1" %*