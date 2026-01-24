const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const { eventTicket, ageVerifier, provider } = require('../utils/web3');
const { ethers } = require('ethers');

// BUY TICKET (Flexible Handler)
// Supports:
// 1. Relay Only (Age Verification)
// 2. Record Only (User called purchaseTicket on-chain)
// 3. Legacy (Backend checks proof, verifies payment, and mints)
router.post('/buy', async (req, res) => {
    try {
        const { eventId, buyerAddress, txHash, ageProof, zkProof, relayOnly, recordOnly } = req.body;

        const event = await Event.findOne({ eventId });
        if (!event) return res.status(404).json({ error: 'Event not found' });

        // ---------------------------------------------------------
        // MODE 1: RELAY ONLY (Gasless Age Verification)
        // ---------------------------------------------------------
        if (relayOnly) {
            if (!zkProof) return res.status(400).json({ error: 'No ZK proof provided for relay' });

            console.log("Processing Age Verification Relay...");
            try {
                const { proof, publicSignals } = zkProof;
                const pA = [proof.pi_a[0], proof.pi_a[1]];
                const pB = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
                const pC = [proof.pi_c[0], proof.pi_c[1]];

                const verifTx = await ageVerifier.verifyAge(pA, pB, pC, publicSignals, eventId, 1);
                console.log("Relayer Tx Sent:", verifTx.hash);
                await verifTx.wait();

                // Wait for indexer propagation
                await new Promise(r => setTimeout(r, 4000));

                return res.json({ success: true, message: 'Age verified on-chain', txHash: verifTx.hash });
            } catch (e) {
                console.error("Relay Failed:", e.message);
                // It might fail if already verified, so we check status
                const isVerified = await ageVerifier.isVerifiedForEvent(buyerAddress, eventId);
                if (isVerified) {
                    return res.json({ success: true, message: 'Already verified' });
                }
                return res.status(500).json({ error: 'Relay failed: ' + e.message });
            }
        }

        // ---------------------------------------------------------
        // MODE 2: RECORD ONLY (Trustless Purchase Sync)
        // ---------------------------------------------------------
        if (recordOnly) {
            console.log("Recording Trustless Purchase...");
            // Wait for tx to be robustly visible
            let receipt = null;
            for (let i = 0; i < 10; i++) {
                receipt = await provider.getTransactionReceipt(txHash);
                if (receipt) break;
                await new Promise(r => setTimeout(r, 1000));
            }

            if (!receipt || receipt.status === 0) {
                // Try getting transaction if receipt not found yet? No, receipt is necessary for logs.
                return res.status(400).json({ error: 'Transaction failed or not found' });
            }

            // Parse logs to find TokenId
            let tokenId = null;
            for (const log of receipt.logs) {
                try {
                    const parsed = eventTicket.interface.parseLog(log);
                    if (parsed.name === 'TicketMinted') {
                        tokenId = parsed.args.tokenId.toString();
                        break;
                    }
                } catch (e) { }
            }

            if (!tokenId) {
                // Fallback: check db if already recorded
                const existing = await Ticket.findOne({ transactionHash: txHash });
                if (existing) return res.json({ tokenId: existing.tokenId, message: 'Already recorded' });
                return res.status(400).json({ error: 'No TicketMinted event found in transaction' });
            }

            // Check if already exists in DB to prevent duplicates
            const existing = await Ticket.findOne({ tokenId });
            if (existing) return res.json({ tokenId, message: 'Purchase already recorded' });

            // Save to DB
            await Ticket.create({
                tokenId,
                eventId,
                buyer: buyerAddress,
                price: event.price,
                transactionHash: txHash,
                ageVerified: event.requiresAgeVerification,
                attended: false,
                purchasedAt: new Date()
            });

            await Event.updateOne({ eventId }, { $inc: { ticketsSold: 1 } });

            return res.json({ tokenId, message: 'Purchase recorded successfully' });
        }

        // ---------------------------------------------------------
        // MODE 3: LEGACY / BACKEND MINT (Fallback)
        // ---------------------------------------------------------

        // Verify Payment Transaction
        let receipt = null;
        for (let i = 0; i < 10; i++) {
            receipt = await provider.getTransactionReceipt(txHash);
            if (receipt) break;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (!receipt || receipt.status === 0) {
            return res.status(400).json({ error: 'Transaction pending or failed' });
        }

        const paymentTx = await provider.getTransaction(txHash);
        if (paymentTx.from.toLowerCase() !== buyerAddress.toLowerCase()) {
            return res.status(400).json({ error: 'Transaction sender mismatch' });
        }

        // Relayer Logic (Mixed in Legacy)
        if (event.requiresAgeVerification && zkProof) {
            console.log("Relaying ZK Proof (Legacy Mode)...");
            try {
                const { proof, publicSignals } = zkProof;
                const pA = [proof.pi_a[0], proof.pi_a[1]];
                const pB = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
                const pC = [proof.pi_c[0], proof.pi_c[1]];
                const verifTx = await ageVerifier.verifyAge(pA, pB, pC, publicSignals, eventId, 1);
                await verifTx.wait();
                await new Promise(r => setTimeout(r, 4000));
            } catch (e) {
                console.error("Legacy Relay error:", e.message);
            }
        }

        // Mint via Owner (Backend pays gas)
        const mintTx = await eventTicket.mintTicket(
            buyerAddress,
            eventId,
            ethers.parseUnits(event.price.toString(), 18),
            event.requiresAgeVerification,
            event.ageRestriction || 0
        );

        const mintReceipt = await mintTx.wait();

        // Find TokenID
        let tokenId = null;
        for (const log of mintReceipt.logs) {
            try {
                const parsed = eventTicket.interface.parseLog(log);
                if (parsed.name === 'TicketMinted') {
                    tokenId = parsed.args.tokenId.toString();
                    break;
                }
            } catch (e) { }
        }

        if (!tokenId) throw new Error("Token ID not found in mint receipt");

        // Save legacy ticket
        await Ticket.create({
            tokenId,
            eventId,
            buyer: buyerAddress,
            price: event.price,
            transactionHash: receipt.hash,
            ageVerified: event.requiresAgeVerification ? true : null,
            attended: false,
            purchasedAt: new Date()
        });

        await Event.updateOne({ eventId }, { $inc: { ticketsSold: 1 } });

        res.json({
            tokenId,
            message: 'Ticket purchased successfully (Legacy)',
            requiresAgeProof: false,
            transactionHash: receipt.hash,
            nftMetadata: {
                name: event.name,
                date: event.date,
                location: event.location,
                price: event.price,
                ageRestricted: event.requiresAgeVerification
            }
        });
    } catch (error) {
        console.error("Buy Error:", error);
        res.status(500).json({ error: error.message });
    }
});


// GET USER TICKETS
router.get('/user/:address', async (req, res) => {
    try {
        const userAddress = req.params.address.toLowerCase();
        // JsonDb doesn't support $regex, so fetch all and filter JS side
        const allTickets = await Ticket.find();
        const tickets = allTickets.filter(t => t.buyer && t.buyer.toLowerCase() === userAddress);

        // Enrich with event details
        const enrichedTickets = await Promise.all(tickets.map(async (ticket) => {
            const event = await Event.findOne({ eventId: ticket.eventId });
            return {
                ...ticket,
                event: event || {}
            };
        }));

        res.json(enrichedTickets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET TICKETS BY EVENT (Organizer View)
router.get('/event/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
        const allTickets = await Ticket.find();
        const tickets = allTickets.filter(t => t.eventId === eventId);
        res.json(tickets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
