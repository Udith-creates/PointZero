const hre = require("hardhat");
const path = require("path");

async function main() {
  const deploymentsDir = path.join(__dirname, "../deployments/localhost");
  const regJson = require(deploymentsDir + "/EventRegistry.json");
  const ticketJson = require(deploymentsDir + "/EventTicket.json");

  const provider = hre.ethers.provider;
  const reg = new hre.ethers.Contract(regJson.address, regJson.abi, provider);
  const ticket = new hre.ethers.Contract(ticketJson.address, ticketJson.abi, provider);

  console.log("EventRegistry address:", regJson.address);
  console.log("EventTicket address:", ticketJson.address);

  const counter = (await reg.eventCounter()).toString();
  console.log("eventCounter:", counter);

  const toCheck = Math.max(1, Math.min(10, Number(counter) + 1));
  for (let i = 0; i < toCheck; i++) {
    try {
      const evt = await reg.getEvent(i);
      console.log(`event ${i}: active=${evt.active} price=${evt.price.toString()} organizer=${evt.organizer}`);
    } catch (e) {
      console.log(`getEvent(${i}) error:`, e.message);
    }
  }

  try {
    const ticketCounter = (await ticket.ticketCounter()).toString();
    console.log("ticketCounter:", ticketCounter);
  } catch (e) {
    console.log("ticketCounter error:", e.message);
  }

  // try ownerOf for token 0 if minted
  try {
    const owner0 = await ticket.ownerOf(0);
    console.log("ownerOf(0):", owner0);
  } catch (e) {
    console.log("ownerOf(0) error:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
