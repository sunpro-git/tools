@echo off
chcp 65001 >nul
title Google Drive 画像インデックス作成

cd /d "%~dp0"

echo ============================================
echo   Google Drive 画像インデックス作成
echo ============================================
echo.
echo 処理を開始します...
echo （中断するには Ctrl+C を押してください）
echo.

npx tsx scripts/reindex.ts

echo.
echo ============================================
if %ERRORLEVEL% EQU 0 (
    echo   完了しました！
) else (
    echo   エラーが発生しました
)
echo ============================================
echo.
pause
