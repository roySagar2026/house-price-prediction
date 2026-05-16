@echo off
echo.
echo   PropSense India -- AI Real Estate Intelligence
echo   10 Cities . XGBoost . RBI HPI Integration
echo.

if not exist "india_housing.csv" (
    echo   [ERROR] india_housing.csv not found in project root.
    pause & exit /b 1
)

echo   [1/3] Installing Python dependencies...
cd backend
pip install -r requirements.txt -q
echo   [2/3] Starting FastAPI backend on :8000
start "PropSense Backend" cmd /k "python main.py"
cd ..

timeout /t 3 /nobreak >nul

echo   [3/3] Starting React frontend on :5173
cd frontend
call npm install --silent
start "PropSense Frontend" cmd /k "npm run dev"
cd ..

echo.
echo   Backend  -> http://localhost:8000
echo   API Docs -> http://localhost:8000/docs
echo   Frontend -> http://localhost:5173
echo.
pause
