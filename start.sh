#!/bin/bash
set -e

SAFFRON='\033[0;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${SAFFRON}  🏛  PropSense India — AI Real Estate Intelligence${NC}"
echo -e "     10 Cities · XGBoost · RBI HPI Integration"
echo ""

[ ! -f "india_housing.csv" ] && echo -e "${RED}  ✗  india_housing.csv not found in project root.${NC}" && exit 1
command -v python3 &>/dev/null || (echo -e "${RED}  ✗  Python 3 not found.${NC}" && exit 1)
command -v node    &>/dev/null || (echo -e "${RED}  ✗  Node.js not found.${NC}" && exit 1)

echo -e "${GREEN}  [1/3] Installing Python dependencies...${NC}"
cd backend && pip install -r requirements.txt -q

echo -e "${GREEN}  [2/3] Starting FastAPI backend on :8000${NC}"
python main.py &
BACKEND_PID=$!
cd ..

sleep 2

echo -e "${GREEN}  [3/3] Starting React frontend on :5173${NC}"
cd frontend && npm install --silent && npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo -e "${SAFFRON}  ✓  Backend  → http://localhost:8000${NC}"
echo -e "${SAFFRON}  ✓  API Docs → http://localhost:8000/docs${NC}"
echo -e "${SAFFRON}  ✓  Frontend → http://localhost:5173${NC}"
echo ""
echo "  Ctrl+C to stop all."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
wait
