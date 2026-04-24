@echo off
echo [1/4] Building the Astro project...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo Build failed! Aborting deployment.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/4] Staging files for Git...
git add .

echo.
set /p commit_msg="[3/4] Enter commit message (or press Enter for default 'update site'): "
if "%commit_msg%"=="" set commit_msg=update site

echo.
echo Committing as: "%commit_msg%"
git commit -m "%commit_msg%"

echo.
echo [4/4] Pushing to GitHub...
git push
if %errorlevel% neq 0 (
    echo.
    echo Wait, push failed. You might need to pull first or check your connection.
    pause
    exit /b %errorlevel%
)

echo.
echo ===============================
echo Deployment successful!
echo ===============================
pause
