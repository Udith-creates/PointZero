const { ethers } = require('ethers');
require('dotenv').config();

// Configuration
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545/';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Provider & Wallet
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = PRIVATE_KEY ? new ethers.Wallet(PRIVATE_KEY, provider) : null;

// Contract ABIs and Addresses (Load from deployments or constant)
// For now, using placeholders. In production, load from ../packages/hardhat/deployments/...
const EVENT_REGISTRY_ADDRESS = process.env.EVENT_REGISTRY_ADDRESS;
const EVENT_TICKET_ADDRESS = process.env.EVENT_TICKET_ADDRESS;
const AGE_VERIFIER_ADDRESS = process.env.AGE_VERIFIER_ADDRESS;

// Load Artifacts
const EventRegistryArtifact = require('../../hardhat/artifacts/contracts/EventRegistry.sol/EventRegistry.json');
const EventTicketArtifact = require('../../hardhat/artifacts/contracts/EventTicket.sol/EventTicket.json');
const AgeVerifierArtifact = require('../../hardhat/artifacts/contracts/AgeRestrictionVerifier.sol/AgeRestrictionVerifier.json');

// Contract Instances
const eventRegistry = wallet && EVENT_REGISTRY_ADDRESS ? new ethers.Contract(EVENT_REGISTRY_ADDRESS, EventRegistryArtifact.abi, wallet) : null;
const eventTicket = wallet && EVENT_TICKET_ADDRESS ? new ethers.Contract(EVENT_TICKET_ADDRESS, EventTicketArtifact.abi, wallet) : null;
const ageVerifier = wallet && AGE_VERIFIER_ADDRESS ? new ethers.Contract(AGE_VERIFIER_ADDRESS, AgeVerifierArtifact.abi, wallet) : null;

module.exports = {
    provider,
    wallet,
    eventRegistry,
    eventTicket,
    ageVerifier,
    EVENT_REGISTRY_ADDRESS,
    EVENT_TICKET_ADDRESS,
    AGE_VERIFIER_ADDRESS
};
