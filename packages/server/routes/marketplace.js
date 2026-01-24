const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');

// LIST TICKET FOR RESALE
router.post('/list', async (req, res) => {
    try {
        const { tokenId, eventId, sellerAddress, resalePrice } = req.body;

        const ticket = await Ticket.findOne({ tokenId });
        if (!ticket) return res.status(404).json({ error: "Ticket not found" });

        const event = await Event.findOne({ eventId });
        if (!event) return res.status(404).json({ error: "Event not found" });

        // Calculate royalty for organizer
        const royalty = (resalePrice * event.royaltyPercent) / 100;
        const sellerProceeds = resalePrice - royalty;

        await Listing.create({
            tokenId,
            eventId,
            seller: sellerAddress,
            resalePrice,
            organizerRoyalty: royalty,
            sellerProceeds,
            listingDate: new Date(),
            sold: false
        });

        res.json({ success: true, royalty, sellerProceeds });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET LISTINGS FOR EVENT
router.get('/event/:eventId', async (req, res) => {
    try {
        const listings = await Listing.find({
            eventId: req.params.eventId,
            sold: false
        });
        res.json(listings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
