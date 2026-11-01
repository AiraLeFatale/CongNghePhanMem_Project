@echo off
chcp 65001 >nul
title Khoi dong lai server (giu tunnel)
cd /d "%~dp0"

rem ============================================================
rem  KHOI DONG LAI SERVER - chi khoi dong lai backend cong 4000.
rem  Tunnel Cloudflare dang chay VAN GIU NGUYEN => chi mat ~3 giay.
rem  Dung file nay moi khi sua code backend hoac backend\.env.
rem  Muon tat ca (ca tunnel): dung TAT-CONG-KHAI.bat
rem ============================================================

set "BASE_URL=http://127.0.0.1:4000"

echo ============================================================
echo   KHOI DONG LAI SERVER  ^(giu nguyen tunnel^)
echo ============================================================
echo.

echo [1/3] Tat server cu o cong 4000...
set "FOUND=0"
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":4000 .*LISTENING"') do (
  taskkill /PID %%p /F >nul 2>nul
  set "FOUND=1"
)
if "%FOUND%"=="1" (
  echo   Da tat server cu.
) else (
  echo   Khong co server nao dang chay - se bat moi.
)
ping -n 3 127.0.0.1 >nul

echo [2/3] Mo server moi trong cua so rieng...
if not exist "backend\node_modules" (
  echo   Chua co thu vien - dang cai, vui long doi...
  call npm --prefix backend install --no-audit --no-fund
  if errorlevel 1 goto :fail
)
start "Thuyet minh - Server" /D "%CD%\backend" cmd /k npm start

echo [3/3] Doi server san sang...
set /a WAIT=0
:waitloop
set /a WAIT+=1
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 '%BASE_URL%/api/health' ^| Out-Null; exit 0 } catch { exit 1 }"
if not errorlevel 1 goto :serverready
if %WAIT% GEQ 40 goto :serverfail
ping -n 2 127.0.0.1 >nul
goto :waitloop

:serverready
echo.
echo ============================================================
echo   XONG - server da chay lai.
echo.
echo   Website : https://cnpm.dpdns.org
echo   Quan tri: https://cnpm.dpdns.org/admin
echo.
echo   Bam F5 tren trinh duyet de thay thay doi.
echo ============================================================
echo.
pause
exit /b 0

:serverfail
echo.
echo [LOI] Server khong phan hoi sau 60 giay.
echo   Mo cua so "Thuyet minh - Server" de xem thong bao loi.
echo.
pause
exit /b 1

:fail
echo.
echo [LOI] Cai thu vien that bai. Kiem tra ket noi mang roi chay lai.
echo.
pause
exit /b 1
