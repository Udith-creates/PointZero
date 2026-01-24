const { eventRegistry, wallet } = require('./utils/web3');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

async function seedRestricted() {
    console.log("Seeding AGE RESTRICTED event...");

    if (!wallet) return console.error("No wallet");

    // Create "Underground Techno" (18+)
    const eventName = "Underground Techno Bunker";
    const priceWei = ethers.parseEther("0.000000001");

    const tx = await eventRegistry.createEvent(
        eventName,
        "Secret Warehouse, Berlin",
        Math.floor(Date.now() / 1000) + 86400 * 3,
        priceWei,
        100,
        "http://localhost:3000/ticket-nft.png",
        10,
        1 // Age Restriction: 1 (Over 18) - Check enum in contract if 0 is None, 1 is Over18
    );

    console.log("Tx sent:", tx.hash);
    const receipt = await tx.wait();

    let eventIdOnChain = null;
    for (const log of receipt.logs) {
        try {
            const parsed = eventRegistry.interface.parseLog(log);
            if (parsed.name === 'EventCreated') {
                eventIdOnChain = parsed.args.eventId.toString();
                break;
            }
        } catch (e) { }
    }

    if (!eventIdOnChain) eventIdOnChain = Math.floor(Date.now() / 1000).toString();
    console.log("Event ID:", eventIdOnChain);

    // Save to DB
    const dbPath = path.join(__dirname, 'data.json');
    let data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    const newEvent = {
        _id: Date.now().toString(),
        eventId: eventIdOnChain,
        organizer: wallet.address,
        name: eventName,
        location: "Secret Warehouse, Berlin",
        date: new Date(Date.now() + 86400000 * 3).toISOString(),
        price: "0.000000001",
        capacity: 100,
        ticketsSold: 0,
        imageURI: "http://localhost:3000/ticket-nft.png",
        requiresAgeVerification: true, // TRUE!
        ageRestriction: 1,
        royaltyPercent: 10,
        description: "Strictly 18+. Bring ID. ZK Proof Required.",
        createdAt: new Date().toISOString()
    };

    data.events.push(newEvent);
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    console.log("Restricted Event saved!");
}

seedRestricted().catch(console.error).finally(() => process.exit());
