const express = require('express');
const router = express.Router();
const snarkjs = require('snarkjs');
const fs = require('fs');
const path = require('path');

// Endpoints for ZK proof generation and verification

// 1. GENERATE ZK PROOF (Client-side in frontend is preferred for privacy, here for demo/fallback)
router.post('/generate-age-proof', async (req, res) => {
    try {
        const { aadharNumber, dateOfBirth, salt } = req.body;

        // Create witness
        const input = {
            aadharNumber: aadharNumber,
            dateOfBirth: dateOfBirth,
            salt: salt,
            currentTimestamp: Math.floor(Date.now() / 1000)
        };

        // Generate proof using WASM
        // Paths relative to server root
        const wasmPath = path.join(__dirname, '../../circuits/ageVerification_js/ageVerification.wasm');
        const zKeyPath = path.join(__dirname, '../../circuits/ageVerification_0001.zkey');

        if (!fs.existsSync(wasmPath) || !fs.existsSync(zKeyPath)) {
            return res.status(503).json({ error: "Circuit files not found. Please compile circuits." });
        }

        const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zKeyPath);

        res.json({
            proof,
            publicSignals,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// 2. VERIFY AGE PROOF ON-CHAIN (Note: this effectively just calls the contract)
router.post('/verify-age', async (req, res) => {
    // In a real app, the client calls the contract directly. 
    // This endpoint handles the flow if the server acts as a relayer or tracks it.
    res.status(501).json({ error: "Not implemented. Client should call smart contract directly." });
});

module.exports = router;
