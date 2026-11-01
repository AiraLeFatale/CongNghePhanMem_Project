@echo off
chcp 65001 >nul
title Thuyet minh Quan 4 - Local
cd /d "%~dp0backend"

echo ============================================
echo   WEBSITE THUYET MINH QUAN 4 (ban local)
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] Chua cai Node.js.
  echo Tai tai: https://nodejs.org  ^(ban LTS^), cai xong khoi dong lai may.
  echo.
  pause
  exit /b 1
)

rem Neu server dang chay san thi chi mo trinh duyet.
netstat -ano | findstr /R /C:":4000 .*LISTENING" >nul
if not errorlevel 1 (
  echo Server dang chay san. Dang mo trinh duyet...
  start "" http://localhost:4000/
  ping -n 3 127.0.0.1 >nul
  exit /b 0
)

rem Lan dau chay: cai thu vien (chi mat vai giay, can mang).
if not exist "node_modules" (
  echo Lan dau chay - dang cai thu vien, vui long doi...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo [LOI] Cai thu vien that bai. Kiem tra ket noi mang roi thu lai.
    pause
    exit /b 1
  )
)

rem Chua co du lieu thi nap du lieu mau cua website.
if not exist "data\narration.db" (
  echo Dang nap du lieu...
  call npm run seed:demo
)

echo.
echo Dang khoi dong server...
echo   Website: http://localhost:4000
echo   Quan tri: http://localhost:4000/admin  ^(admin / admin123^)
echo.
echo *** GIU CUA SO NAY MO. Dong cua so = tat server. ***
echo.

rem Cho 4 giay cho server san sang roi tu mo trinh duyet.
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep 4; Start-Process 'http://localhost:4000/'"

call npm start
echo.
echo Server da dung.
pause
