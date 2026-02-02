const hre = require("hardhat");
const path = require("path");

async function main() {
  const deploymentsDir = path.join(__dirname, "../deployments/localhost");
  const regJson = require(deploymentsDir + "/EventRegistry.json");
  const ticketJson = require(deploymentsDir + "/EventTicket.json");

  const [organizer, buyer] = await hre.ethers.getSigners();
  console.log("organizer:", organizer.address);
  console.log("buyer:", buyer.address);

  const reg = new hre.ethers.Contract(regJson.address, regJson.abi, organizer);
  const ticket = new hre.ethers.Contract(ticketJson.address, ticketJson.abi, hre.ethers.provider);

  // Create event as organizer
  const priceEth = "0.01";
  const priceWei = hre.ethers.parseEther(priceEth);
  console.log("Creating event with price (wei):", priceWei.toString());

  const tx = await reg.connect(organizer).createEvent(
    "Automated Test Event",
    "Metaverse",
    Math.floor(Date.now() / 1000) + 86400 * 7,
    priceWei,
    100,
    "https://example.com/image.png",
    5,
    0 // no age restriction
  );
  console.log("createEvent tx sent", tx.hash);
  const receipt = await tx.wait();
  let eventId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = reg.interface.parseLog(log);
      if (parsed.name === 'EventCreated') {
        eventId = parsed.args.eventId.toString();
        break;
      }
    } catch (e) {}
  }
  if (!eventId) {
    console.log("Could not parse eventId from logs; reading eventCounter");
    const counter = (await reg.eventCounter()).toString();
    eventId = (Number(counter) - 1).toString();
  }
  console.log("Event created with id:", eventId);

  // Buyer purchases ticket
  const ticketContractAsBuyer = ticket.connect(buyer);
  const buyTx = await ticketContractAsBuyer.purchaseTicket(Number(eventId), { value: priceWei });
  console.log("purchaseTicket tx sent", buyTx.hash);
  const buyReceipt = await buyTx.wait();
  console.log("purchase mined, gasUsed:", buyReceipt.gasUsed.toString());

  // Inspect ticketCounter and owner of token 0
  try {
    const ticketCounter = (await ticket.ticketCounter()).toString();
    console.log("ticketCounter:", ticketCounter);
    const owner0 = await ticket.ownerOf(0);
    console.log("ownerOf(0):", owner0);
  } catch (e) {
    console.log("post-purchase inspection error:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
