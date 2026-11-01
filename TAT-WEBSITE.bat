@echo off
chcp 65001 >nul
title Tat website local
echo Dang tat website (cong 4000)...
set FOUND=0
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":4000 .*LISTENING"') do (
  taskkill /PID %%p /F >nul 2>nul
  set FOUND=1
)
if "%FOUND%"=="1" (
  echo Da tat.
) else (
  echo Khong co server nao dang chay.
)
ping -n 3 127.0.0.1 >nul
