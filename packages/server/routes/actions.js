const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const { eventTicket, ageVerifier, provider } = require('../utils/web3');
const { ethers } = require('ethers');

// Helper: Base URL for this API (Assuming localhost:3001 for dev)
const BASE_URL = "http://localhost:3001";
const FRONTEND_URL = "http://localhost:3000";

// HEADERS for CORS (Actions require specific headers)
const ACTIONS_CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Encoding, Accept-Encoding',
    'X-Action-Version': '1',
    'X-Blockchain-Ids': 'eip155:31337' // Hardhat Localhost Chain ID
};

// Middleware to apply headers
router.use((req, res, next) => {
    res.set(ACTIONS_CORS_HEADERS);
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// GET /api/actions/events/:eventId
// Returns the Metadata for the Action Card (Image, Title, Button)
router.get('/events/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findOne({ eventId });

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        const iconUrl = event.imageURI.startsWith('http') ? event.imageURI : `${FRONTEND_URL}${event.imageURI}`;

        const payload = {
            icon: iconUrl,
            title: `🎟️ ${event.name}`,
            description: `${event.location} | ${new Date(event.date).toLocaleDateString()}\nPrice: ${event.price} ETH\n${event.requiresAgeVerification ? "🔞 Age Restricted (18+)" : "✅ Open for All"}`,
            label: "Buy Ticket",
            links: {
                actions: [
                    {
                        label: `Buy Ticket (${event.price} ETH)`, // Button Text
                        href: `${BASE_URL}/api/actions/events/${eventId}`, // POST endpoint
                    }
                ]
            }
        };

        res.json(payload);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// POST /api/actions/events/:eventId
// Generates the Transaction usage
router.post('/events/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
        const { account } = req.body; // EVM Address sent by the Client (Dialect/Wallet)

        if (!account) {
            return res.status(400).json({ error: "Account address required" });
        }

        const event = await Event.findOne({ eventId });
        if (!event) return res.status(404).json({ error: "Event not found" });

        // ---------------------------------------------------------
        // LOGIC CHECK: Age Verification
        // ---------------------------------------------------------
        if (event.requiresAgeVerification) {
            // Check On-Chain Status
            const isVerified = await ageVerifier.isVerifiedForEvent(account, eventId);

            if (!isVerified) {
                // If not verified, we cannot allow BUY.
                // Return a MESSAGE action or LINK to verify.
                // Protocol Spec allows returning an error or a message.
                // We'll return a Transaction that REVERTS with a message? No, bad UX.
                // We'll return a specific error message format for Blink Clients.
                return res.status(400).json({
                    message: "⚠️ Verification Required! You must verify your age (18+) on our site before buying.",
                    type: "transaction" // Should technically be something else or handle UI feedback
                });
            }
        }

        // ---------------------------------------------------------
        // Construct EVM Transaction (Mint Ticket)
        // ---------------------------------------------------------

        // We use the 'populateTransaction' to get raw data
        // Contract: EventTicket.mintTicket(to, eventId, price, requiresAge, ageRestriction)
        const contractInterface = eventTicket.interface;
        const data = contractInterface.encodeFunctionData("mintTicket", [
            account, // mint to buyer
            eventId,
            ethers.parseEther(event.price.toString()),
            event.requiresAgeVerification,
            event.ageRestriction || 0
        ]);

        const transaction = {
            to: await eventTicket.getAddress(),
            value: ethers.parseEther(event.price.toString()).toString(),
            data: data,
            chainId: "31337" // Localhost
        };

        res.json({
            transaction: JSON.stringify(transaction), // Serialized for client
            message: `Minting Ticket #${event.ticketsSold + 1} for ${event.name}!`
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
