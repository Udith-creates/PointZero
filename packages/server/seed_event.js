const { eventRegistry, wallet } = require('./utils/web3');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

async function seed() {
    console.log("Seeding default event...");

    if (!wallet) {
        console.error("No wallet configured (PRIVATE_KEY missing in .env)");
        return;
    }

    if (!eventRegistry) {
        console.error("EventRegistry contract not found. Check deployments.");
        return;
    }

    const eventName = "PointZero Launch Party";
    const priceEth = "0.01";
    const priceWei = ethers.parseEther(priceEth);

    console.log(`Creating event '${eventName}' on-chain...`);

    // args: name, location, date, price, capacity, imageURI, royalty, ageRestriction
    const tx = await eventRegistry.createEvent(
        eventName,
        "Metaverse",
        Math.floor(Date.now() / 1000) + 86400 * 7, // 7 Days from now
        priceWei,
        500,
        "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=1000&auto=format&fit=crop",
        5, // royalty
        0 // no age restriction
    );

    console.log("Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("Transaction mined!");

    let eventIdOnChain = null;
    for (const log of receipt.logs) {
        try {
            const parsed = eventRegistry.interface.parseLog(log);
            if (parsed.name === 'EventCreated') {
                eventIdOnChain = parsed.args.eventId.toString();
                console.log("Found Event ID from Log:", eventIdOnChain);
                break;
            }
        } catch (e) { }
    }

    // Fallback if parsing fails - in production this would be critical, but for seed we can guess if sequential
    if (!eventIdOnChain) {
        console.log("⚠️ Could not parse Event ID from logs. Assuming ID based on timestamp (might fail buying).");
        eventIdOnChain = Math.floor(Date.now() / 1000);
    }

    // 2. Add to DB
    const dbPath = path.join(__dirname, 'data.json');
    let data = { events: [], tickets: [], listings: [] };

    if (fs.existsSync(dbPath)) {
        try {
            data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        } catch (e) { console.error("Error reading DB, resetting."); }
    }

    const newEvent = {
        _id: Date.now().toString(),
        eventId: eventIdOnChain,
        organizer: wallet.address,
        name: eventName,
        location: "Metaverse",
        date: new Date(Date.now() + 86400000 * 7).toISOString(),
        price: priceEth,
        capacity: 500,
        ticketsSold: 0,
        imageURI: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=1000&auto=format&fit=crop",
        requiresAgeVerification: false,
        ageRestriction: 0,
        royaltyPercent: 5,
        description: "Official launch event for PointZero. Tickets available now!",
        createdAt: new Date().toISOString()
    };

    data.events.push(newEvent);
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    console.log("Event saved to data.json successfully!");
}

seed().catch(console.error).finally(() => process.exit());
