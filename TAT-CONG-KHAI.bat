@echo off
chcp 65001 >nul
title Tat website cong khai
echo ============================================================
echo   TAT WEBSITE CONG KHAI
echo ============================================================
echo.

echo [1/2] Dang tat tunnel...
taskkill /IM cloudflared.exe /F >nul 2>nul
if errorlevel 1 (
  echo   Khong co cloudflared dang chay.
) else (
  echo   Da tat tunnel.
)

echo [2/2] Dang tat server local ^(cong 4000^)...
set "FOUND=0"
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":4000 .*LISTENING"') do (
  taskkill /PID %%p /F >nul 2>nul
  set "FOUND=1"
)
if "%FOUND%"=="1" (
  echo   Da tat server.
) else (
  echo   Khong co server nao dang chay.
)

echo.
echo Neu ban da cai tunnel thanh Windows service, tat them bang
echo PowerShell ^(Admin^):  cloudflared service uninstall
echo.
pause
