@echo off
cd /d "%~dp0"
echo Starting index...
echo Press Ctrl+C to cancel
echo.
call node scripts/setup-wasm.cjs
call npx tsx scripts/reindex.ts
echo.
if %ERRORLEVEL% EQU 0 (
    echo Done!
) else (
    echo Error occurred.
)
pause
