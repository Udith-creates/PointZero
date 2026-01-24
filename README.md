# Blink Tickets 🎟️

**Privacy-First Event Ticketing Platform**

Blink Tickets is a decentralized ticketing platform that solves three major problems: Scalpers, Privacy, and Trust. We use **Zero-Knowledge Proofs (ZKPs)** to verify age without revealing identity, **Magic Links** for easy onboarding, and a **Trustless Escrow** system to ensure funds are safe until the event concludes.

## ✨ Key Features

- **🔐 ZK Age Verification:** Users prove they are 18+ (verified via Aadhaar signature) without revealing their actual date of birth or ID number.
- **💸 Trustless Escrow:** Ticket funds are held in a smart contract, not sent directly to the organizer. Organizers can only withdraw after the event.
- **✨ Magic Link Onboarding:** Users can buy tickets via a simple link, generating a burner wallet on the fly if needed.
- **🔄 Refund System:** Automated refunds if an event is cancelled.

---

## 🚀 Quick Start Guide

### 1. Automated Setup (Recommended)
We have included a script to install all dependencies and configure the environment automatically.

```bash
# Make the script executable (Mac/Linux)
chmod +x setup.sh

# Run the setup
./setup.sh
```

### 2. Manual Start
Once setup is complete, you need to run these **4 commands in separate terminals**:

**Terminal 1: Start Blockchain**
```bash
cd packages/hardhat
npx hardhat node
```

**Terminal 2: Deploy Contracts**
*(Run this after the chain is running)*
```bash
cd packages/hardhat
npx hardhat deploy --network localhost --reset
```

**Terminal 3: Start Backend API**
```bash
cd packages/server
npm run dev
```

**Terminal 4: Start Frontend**
```bash
cd packages/nextjs
yarn start
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## 📂 Project Structure

```
BlinkTickets
├── packages
│   ├── hardhat      # Smart Contracts (Solidity), Deploy Scripts
│   ├── nextjs       # Frontend App (Next.js, Tailwind, Wagmi)
│   └── server       # Backend API (Express, SnarkJS, JSON DB)
├── setup.sh         # One-click installer
└── README.md        # This file
```

## 🛠️ Tech Stack
- **Languages:** Solidity, TypeScript, JavaScript
- **Frameworks:** Next.js, Express, Hardhat
- **Libraries:** Wagmi, Viem, SnarkJS, Circom
- **ZK Circuits:** Groth16 Proof (Age Verification)

---

*Verified Privacy-Preserving Architecture*
