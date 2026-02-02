@echo off
echo ===================================================
echo      🚀 Starting PointZero (Blink Tickets) 🚀
echo ===================================================

echo 1️⃣  Starting Local Blockchain...
start "1. Hardhat Node" cmd /k "cd packages\hardhat && npx hardhat node --network hardhat"

echo ⏳ Waiting 10 seconds for blockchain to initialize...
timeout /t 10 /nobreak >nul

echo 2️⃣  Deploying Smart Contracts...
start "2. Contract Deployment" cmd /k "cd packages\hardhat && npx hardhat deploy --network localhost && echo. && echo ✅ Deployment Finished! Contracts are live."

echo 3️⃣  Starting Backend Server...
start "3. Backend API" cmd /k "cd packages\server && npm run dev"

echo 4️⃣  Starting Frontend Application...
start "4. Frontend App" cmd /k "cd packages\nextjs && yarn start"

echo ===================================================
echo ✅ All services are launching in separate windows!
echo 🌍 Web App: http://localhost:3000
echo 🔌 API: http://localhost:3001
echo ===================================================
echo You can minimize the terminal windows to keep them running.
pause
