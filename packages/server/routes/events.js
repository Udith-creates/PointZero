const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Event = require('../models/Event');
const { eventRegistry } = require('../utils/web3');

// CREATE EVENT - Organizer
router.post('/create', async (req, res) => {
    try {
        const {
            name,
            location,
            date,
            price,
            capacity,
            imageURI,
            royaltyPercent,
            ageRestriction,
            organizerAddress // Sent from frontend
        } = req.body;

        // Note: In production, the backend might listen to events or the frontend sends the txHash
        // Here we assume the frontend sent the eventId after creating on-chain, OR we create it here if we hold the private key (unsafe usually).
        // The user guide implies "Create on blockchain" happening here:
        // "const eventTx = await eventRegistry.createEvent(...)"
        // This requires a funded backend wallet. 

        let eventId;

        // if (eventRegistry) {
        //     const tx = await eventRegistry.createEvent(
        //         name,
        //         location,
        //         Date.parse(date) / 1000,
        //         price,
        //         capacity,
        //         imageURI,
        //         royaltyPercent,
        //         ageRestriction || 0
        //     );
        //     const receipt = await tx.wait();
        //     // Parse eventId from logs (simplified)
        //     // eventId = ...
        //     // For demo, we might accept eventId from body if created on frontend
        // }

        // For now, allow frontend to pass eventId if not creating on backend
        eventId = req.body.eventId || Date.now(); // Fallback Mock ID

        // Generate Magic Link
        const linkToken = crypto.randomBytes(32).toString('hex');
        const magicLink = `https://blinktickets.xyz/buy/${name.toLowerCase().replace(/\s/g, '-')}-${eventId}`; // Mock URL

        // Save to database
        await Event.create({
            eventId,
            organizer: organizerAddress,
            name,
            location,
            date,
            price,
            capacity,
            imageURI,
            royaltyPercent,
            ageRestriction: ageRestriction || 0,
            requiresAgeVerification: ageRestriction && ageRestriction > 0,
            linkToken,
            magicLink,
            ticketsSold: 0
        });

        res.json({
            eventId,
            magicLink,
            linkToken
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// GET ALL EVENTS
router.get('/', async (req, res) => {
    try {
        const events = await Event.find();
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET EVENT DETAILS - Public
router.get('/details/:eventId', async (req, res) => {
    try {
        const event = await Event.findOne({ eventId: req.params.eventId });
        if (!event) return res.status(404).json({ error: "Event not found" });

        res.json({
            eventId: event.eventId,
            name: event.name,
            location: event.location,
            date: event.date,
            price: event.price,
            capacity: event.capacity,
            ticketsSold: event.ticketsSold,
            imageURI: event.imageURI,
            availableTickets: event.capacity - event.ticketsSold,
            requiresAgeVerification: event.requiresAgeVerification,
            organizer: event.organizer
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
