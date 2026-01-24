#!/bin/bash

# Blink Tickets - One-Click Setup Script
# Run this from the root directory: ./setup.sh

echo "============================================="
echo "   🎟️  SETTING UP BLINK TICKETS ENVIRONMENT   "
echo "============================================="

# 1. Check Node.js
if ! command -v node &> /dev/null
then
    echo "❌ Node.js could not be found. Please install Node.js (v18+ recommended) and try again."
    exit 1
fi
echo "✅ Node.js detected: $(node -v)"

# 2. Install Dependencies
echo "---------------------------------------------"
echo "📥 Installing dependencies..."

echo "   > Installing Root dependencies..."
if [ -f "yarn.lock" ]; then
    yarn install
else
    npm install
fi

echo "   > Installing Hardhat dependencies..."
cd packages/hardhat
if [ -f "yarn.lock" ]; then
    yarn install
else
    npm install
fi
cd ../..

echo "   > Installing Next.js Frontend dependencies..."
cd packages/nextjs
if [ -f "yarn.lock" ]; then
    yarn install
else
    npm install
fi
cd ../..

echo "   > Installing Backend Server dependencies..."
cd packages/server
npm install
cd ../..
echo "✅ Dependencies installed."

# 3. Environment Configuration
echo "---------------------------------------------"
echo "⚙️  Configuring Environment Variables..."

# Backend .env
if [ ! -f "packages/server/.env" ]; then
    echo "PORT=3001
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337" > packages/server/.env
    echo "   > Created packages/server/.env"
else
    echo "   > packages/server/.env already exists."
fi

# Frontend .env.local
if [ ! -f "packages/nextjs/.env.local" ]; then
    echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_IGNORE_BUILD_ERROR=true" > packages/nextjs/.env.local
    echo "   > Created packages/nextjs/.env.local"
else
    echo "   > packages/nextjs/.env.local already exists."
fi
echo "✅ Environment configured."

# 4. Compile Smart Contracts
echo "---------------------------------------------"
echo "🔨 Compiling Smart Contracts..."
cd packages/hardhat
npx hardhat compile
cd ../..
echo "✅ Contracts compiled."

# 5. Initialize Database
echo "---------------------------------------------"
echo "💾 Initializing JSON Database..."
if [ ! -f "packages/server/data.json" ]; then
    echo '{ "events": [], "tickets": [] }' > packages/server/data.json
    echo "   > Created empty data.json database."
else
    echo "   > Database already exists."
fi
echo "✅ Database ready."

# 6. Final Instructions
echo "============================================="
echo "🎉 SETUP COMPLETE! READY TO LAUNCH."
echo "============================================="
echo ""
echo "Please open 4 SEPARATE terminal tabs and run the following commands in order:"
echo ""
echo "1️⃣  Start Local Blockchain:"
echo "    cd packages/hardhat && npx hardhat node"
echo ""
echo "2️⃣  Deploy Contracts (Wait for chain to start first):"
echo "    cd packages/hardhat && npx hardhat deploy --network localhost --reset"
echo ""
echo "3️⃣  Start Backend Server:"
echo "    cd packages/server && npm run dev"
echo ""
echo "4️⃣  Start Frontend App:"
echo "    cd packages/nextjs && yarn start"
echo ""
echo "🌍 App will be available at http://localhost:3000"
echo "============================================="
