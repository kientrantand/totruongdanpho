@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>&1
if %errorlevel%==0 (py -3 app.py --reset-admin) else (python app.py --reset-admin)
echo.
echo Luu mat khau moi o tren. Bam phim bat ky de dong.
pause >nul
