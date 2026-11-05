@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ======================================================
echo   HE THONG BINH CHON TO TRUONG DAN PHO - NINH BINH
echo ======================================================
echo.
where py >nul 2>&1
if %errorlevel%==0 (
 py -3 app.py
) else (
 python app.py
)
echo.
echo May chu da dung. Bam phim bat ky de dong.
pause >nul
