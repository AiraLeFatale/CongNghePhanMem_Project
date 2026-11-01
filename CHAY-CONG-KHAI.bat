@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
title Thuyet minh Quan 4 - Cong khai
cd /d "%~dp0"

set "CF_DIR=%~dp0cloudflare"
set "TOKEN_FILE=%CF_DIR%\tunnel-token.txt"
set "DOMAIN_FILE=%CF_DIR%\domain.txt"
set "CONFIG_FILE=%CF_DIR%\config.yml"
set "BASE_URL=http://127.0.0.1:4000"

rem Them cac thu muc hay gap cua cloudflared vao PATH cua phien hien tai
rem (may vua cai xong co the chua thay PATH moi cho den khi mo lai cmd).
set "PATH=%PATH%;%LOCALAPPDATA%\Microsoft\WinGet\Links"
if exist "%ProgramFiles%\cloudflared\cloudflared.exe" set "PATH=%PATH%;%ProgramFiles%\cloudflared"
if exist "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" set "PATH=%PATH%;%ProgramFiles(x86)%\cloudflared"

echo ============================================================
echo   DUA WEBSITE LEN INTERNET - Cloudflare Tunnel
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] Chua cai Node.js.
  echo Tai tai: https://nodejs.org  ^(ban LTS^), cai xong khoi dong lai may.
  echo.
  pause
  exit /b 1
)

rem ------------------------------------------------------------------
rem 1. Kiem tra cloudflared, tu cai neu may chua co.
rem ------------------------------------------------------------------
where cloudflared >nul 2>nul
if errorlevel 1 (
  echo [1/4] Chua co cloudflared - dang cai bang winget...
  winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
  set "PATH=%PATH%;%LOCALAPPDATA%\Microsoft\WinGet\Links"
  if exist "%ProgramFiles%\cloudflared\cloudflared.exe" set "PATH=%PATH%;%ProgramFiles%\cloudflared"
  if exist "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" set "PATH=%PATH%;%ProgramFiles(x86)%\cloudflared"
)
where cloudflared >nul 2>nul
if errorlevel 1 (
  echo.
  echo [LOI] Khong tim thay cloudflared.
  echo Mo PowerShell va chay: winget install --id Cloudflare.cloudflared -e
  echo.
  pause
  exit /b 1
)

rem ------------------------------------------------------------------
rem 2. Xac dinh cach chay tunnel.
rem    CACH A (dang dung tren may nay): da co cloudflare\config.yml
rem      - chua san ten tunnel + ten mien, chi can chay, KHONG hoi gi.
rem    CACH B (thu cong): chua co config.yml thi hoi token tu Dashboard.
rem ------------------------------------------------------------------
if not exist "%CF_DIR%" mkdir "%CF_DIR%"

if exist "%CONFIG_FILE%" goto :use_config
goto :use_token

:use_config
rem Doc ten tunnel va ten mien tu config.yml chi de in ra man hinh cho dung.
for /f "tokens=2 delims=:" %%a in ('findstr /b /c:"tunnel:" "%CONFIG_FILE%"') do set "TUNNEL_NAME=%%a"
for /f "tokens=2 delims=:" %%a in ('findstr /c:"hostname:" "%CONFIG_FILE%"') do set "DOMAIN=%%a"
for /f "tokens=* delims= " %%a in ("!TUNNEL_NAME!") do set "TUNNEL_NAME=%%a"
for /f "tokens=* delims= " %%a in ("!DOMAIN!") do set "DOMAIN=%%a"
set "MODE=config"
if "%DOMAIN%"=="" (
  echo [LOI] Khong doc duoc ten mien trong cloudflare\config.yml
  echo   Xem lai file do hoac lam lai theo docs\dua-len-domain.md
  pause
  exit /b 1
)
if "%TUNNEL_NAME%"=="" (
  echo [LOI] Khong doc duoc ten tunnel trong cloudflare\config.yml
  pause
  exit /b 1
)
echo [2/4] Dung cau hinh co san: cloudflare\config.yml
echo   Ten mien: %DOMAIN%
echo.
goto :after_tunnel_info

:use_token
set "MODE=token"
rem Hoi lai neu bo trong, de nguoi dung khong phai chay lai tu dau.
if exist "%TOKEN_FILE%" goto :have_token
echo [2/4] Nhap thong tin tunnel ^(chi lan dau^).
echo.
echo   Lay token tai: Cloudflare Dashboard
echo     -^> Networking -^> Tunnels -^> chon tunnel
echo     -^> Configure / Install connector -^> copy chuoi bat dau bang "eyJ..."
echo.
set /a TRIES=0
:ask_token
set /a TRIES+=1
set /p "TOKEN=Nhap token tunnel: "
if not "!TOKEN!"=="" goto :token_ok
if !TRIES! GEQ 3 (
  echo [LOI] Khong doc duoc token ^(da thu 3 lan^).
  echo   Hay mo file .bat bang cach bam dup chuot, khong chay qua pipe.
  pause
  exit /b 1
)
echo   Token khong duoc de trong. Thu lai.
goto :ask_token
:token_ok
> "%TOKEN_FILE%" echo(!TOKEN!
echo   Da luu token vao cloudflare\tunnel-token.txt
echo.
:have_token

if exist "%DOMAIN_FILE%" goto :have_domain
set /a TRIES=0
echo   Vi du ten mien: thuyetminh.dpdns.org
:ask_domain
set /a TRIES+=1
set /p "DOMAIN=Nhap ten mien: "
if not "!DOMAIN!"=="" goto :domain_ok
if !TRIES! GEQ 3 (
  echo [LOI] Khong doc duoc ten mien ^(da thu 3 lan^).
  pause
  exit /b 1
)
echo   Ten mien khong duoc de trong. Thu lai.
goto :ask_domain
:domain_ok
> "%DOMAIN_FILE%" echo(!DOMAIN!
echo   Da luu ten mien vao cloudflare\domain.txt
echo.
:have_domain

set "TOKEN="
set /p "TOKEN="<"%TOKEN_FILE%"
set "DOMAIN="
set /p "DOMAIN="<"%DOMAIN_FILE%"

rem Cat khoang trang thua (copy/dan tu trinh duyet hay dinh).
for /f "tokens=* delims= " %%a in ("%TOKEN%") do set "TOKEN=%%a"
for /f "tokens=* delims= " %%a in ("%DOMAIN%") do set "DOMAIN=%%a"

if "%TOKEN%"=="" (
  echo [LOI] File cloudflare\tunnel-token.txt dang rong.
  pause
  exit /b 1
)
if "%DOMAIN%"=="" (
  echo [LOI] File cloudflare\domain.txt dang rong.
  pause
  exit /b 1
)

:after_tunnel_info

rem ------------------------------------------------------------------
rem 3. Bao dam JWT_SECRET manh. Day la lop bao ve quan trong nhat khi
rem    server ra Internet: secret yeu = nguoi khac tu tao duoc token admin.
rem ------------------------------------------------------------------
echo [3/4] Kiem tra cau hinh bao mat...
rem Tat delayed expansion trong luc goi node: code JS co dau "!" (phu dinh),
rem neu de bat thi cmd se coi do la bien va cat mat doan code.
setlocal DisableDelayedExpansion
node -e "const fs=require('fs'),c=require('crypto'),p='backend/.env';let t=fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';if(t&&!t.endsWith('\n'))t+='\n';const m=t.match(/^JWT_SECRET=(.*)$/m);const v=m?m[1].trim():'';const weak=!v||v.length<32||v==='change-me'||v.includes('dev-only');if(weak){const s=c.randomBytes(48).toString('base64url');t=m?t.replace(/^JWT_SECRET=.*$/m,'JWT_SECRET='+s):t+'JWT_SECRET='+s+'\n';fs.writeFileSync(p,t);console.log('  JWT_SECRET: da tao moi (48 byte ngau nhien).')}else{console.log('  JWT_SECRET: OK.')}"
endlocal

rem ------------------------------------------------------------------
rem 4. Khoi dong lai server local de chac chan no doc .env moi nhat.
rem    (Neu de server cu chay tiep, no van dung JWT_SECRET cu trong RAM.)
rem ------------------------------------------------------------------
echo [4/4] Khoi dong server local...
netstat -ano | findstr /R /C:":4000 .*LISTENING" >nul
if not errorlevel 1 (
  echo   Dang tat server cu...
  call :killport
  ping -n 3 127.0.0.1 >nul
)

if not exist "backend\node_modules" (
  echo   Lan dau chay - dang cai thu vien, vui long doi...
  call npm --prefix backend install --no-audit --no-fund
  if errorlevel 1 goto :fail
)
if not exist "backend\data\narration.db" (
  echo   Chua co du lieu - dang nap du lieu demo...
  call npm --prefix backend run seed:demo
  if errorlevel 1 goto :fail
)
echo   Dang mo server trong cua so moi...
start "Thuyet minh - Server" /D "%CD%\backend" cmd /k npm start

echo   Dang doi server san sang...
set /a WAIT=0
:waitloop
set /a WAIT+=1
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 '%BASE_URL%/api/health' | Out-Null; exit 0 } catch { exit 1 }"
if not errorlevel 1 goto :serverready
if %WAIT% GEQ 40 goto :serverfail
ping -n 2 127.0.0.1 >nul
goto :waitloop

:serverready
echo.
echo ============================================================
echo   WEBSITE CONG KHAI : https://%DOMAIN%
echo   QUAN TRI          : https://%DOMAIN%/admin
echo.
echo   GIU CUA SO NAY MO. Dong cua so = tat tunnel.
echo   Muon tat ca: chay TAT-CONG-KHAI.bat
echo ============================================================
echo.
echo Dang ket noi Cloudflare...
echo.
rem CACH A: chay bang config.yml (khong can token, thong tin nam trong
rem         %USERPROFILE%\.cloudflared\<tunnel-id>.json)
rem CACH B: chay bang token lay tu Dashboard.
if /i "%MODE%"=="config" (
  cloudflared tunnel --config "%CONFIG_FILE%" run "%TUNNEL_NAME%"
) else (
  cloudflared tunnel run --token "%TOKEN%"
)
echo.
echo Tunnel da dung. Neu co loi, xem phan "Su co thuong gap"
echo trong docs\dua-len-domain.md.
pause
exit /b 0

:serverfail
echo.
echo [LOI] Server khong phan hoi sau 60 giay.
echo   - Mo cua so "Thuyet minh - Server" de xem loi.
echo   - Thu chay CHAY-WEBSITE.bat truoc, dam bao local hoat dong.
echo.
pause
exit /b 1

:fail
echo.
echo [LOI] Cai dat / nap du lieu that bai.
echo   Kiem tra ket noi mang roi chay lai.
echo.
pause
exit /b 1

:killport
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":4000 .*LISTENING"') do taskkill /PID %%p /F >nul 2>nul
exit /b 0
