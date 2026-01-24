import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployBlinkTickets: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployer } = await hre.getNamedAccounts();
    const { deploy } = hre.deployments;

    console.log("----------------------------------------------------");
    console.log("Deploying Blink Tickets Contracts...");

    // 1. Deploy Groth16Verifier (from verifier.sol)
    // Note: Ensure verifier.sol is compiled and the artifact is named "Groth16Verifier"
    const verifierDeployment = await deploy("Groth16Verifier", {
        from: deployer,
        args: [],
        log: true,
        autoMine: true,
    });
    console.log("Groth16Verifier deployed at:", verifierDeployment.address);

    // 2. Deploy AgeRestrictionVerifier
    const ageVerifierDeployment = await deploy("AgeRestrictionVerifier", {
        from: deployer,
        args: [verifierDeployment.address], // Pass verifier address
        log: true,
        autoMine: true,
    });
    console.log("AgeRestrictionVerifier deployed at:", ageVerifierDeployment.address);

    // 3. Deploy RoyaltyManager
    const royaltyManagerDeployment = await deploy("RoyaltyManager", {
        from: deployer,
        args: [],
        log: true,
        autoMine: true,
    });
    console.log("RoyaltyManager deployed at:", royaltyManagerDeployment.address);

    // 4. Deploy EventRegistry
    const eventRegistryDeployment = await deploy("EventRegistry", {
        from: deployer,
        args: [],
        log: true,
        autoMine: true,
    });
    console.log("EventRegistry deployed at:", eventRegistryDeployment.address);

    // 5. Deploy EventTicket
    const eventTicketDeployment = await deploy("EventTicket", {
        from: deployer,
        args: [eventRegistryDeployment.address, ageVerifierDeployment.address],
        log: true,
        autoMine: true,
    });
    console.log("EventTicket deployed at:", eventTicketDeployment.address);

    console.log("----------------------------------------------------");
};

export default deployBlinkTickets;
deployBlinkTickets.tags = ["BlinkTickets"];
