// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./EventRegistry.sol";
import "./AgeRestrictionVerifier.sol";

contract EventTicket is ERC721, Ownable {
    struct TicketMetadata {
        uint256 eventId;
        uint256 price;
        bool attended;
        bool resold;
        uint256 originalPrice;
        bool requiresAgeVerification;
        uint256 requiredAge; // 0=18+, 1=21+, 2=25+
    }
    
    mapping(uint256 => TicketMetadata) public tickets;
    mapping(address => bool) public verifiers; // Event organizers
    uint256 public ticketCounter;
    
    // Trustless Escrow & Refund
    EventRegistry public registry;
    AgeRestrictionVerifier public ageVerifier;

    mapping(uint256 => uint256) public escrowBalance;
    mapping(uint256 => bool) public eventCancelled;
    mapping(uint256 => bool) public fundsWithdrawn;
    
    event TicketMinted(address indexed buyer, uint256 indexed eventId, uint256 tokenId);
    event TicketVerified(uint256 indexed tokenId, bool attended);
    event TicketResold(uint256 indexed tokenId, address indexed newOwner);
    event AgeRestrictionApplied(uint256 indexed tokenId, uint256 minAge);
    event FundsWithdrawn(uint256 indexed eventId, uint256 amount);
    event EventCancelled(uint256 indexed eventId);
    event RefundClaimed(uint256 indexed tokenId, address indexed claimant, uint256 amount);
    
    constructor(address _registry, address _ageVerifier) ERC721("BlinkTicket", "BLINK") Ownable(msg.sender) {
        registry = EventRegistry(_registry);
        ageVerifier = AgeRestrictionVerifier(_ageVerifier);
    }
    
    // TRUSTLESS PURCHASE
    function purchaseTicket(uint256 eventId) external payable {
        EventRegistry.Event memory evt = registry.getEvent(eventId);
        
        require(evt.active, "Event not active in registry");
        require(!eventCancelled[eventId], "Event cancelled");
        require(msg.value >= evt.price, "Insufficient payment");
        // Note: Capacity check ideally happens here, but requires calls to Registry or tracking here.
        // We assume unlimited or Registry tracking updates elsewhere for simpler demo.
        
        if (evt.requiresAgeVerification) {
            bool verified = ageVerifier.isVerifiedForEvent(msg.sender, eventId);
            require(verified, "Age verification required");
        }

        uint256 tokenId = ticketCounter++;
        _safeMint(msg.sender, tokenId);
        
        tickets[tokenId] = TicketMetadata({
            eventId: eventId,
            price: msg.value,
            attended: false,
            resold: false,
            originalPrice: msg.value,
            requiresAgeVerification: evt.requiresAgeVerification,
            requiredAge: uint256(evt.ageRestriction)
        });
        
        escrowBalance[eventId] += msg.value;
        
        emit TicketMinted(msg.sender, eventId, tokenId);
    }

    // ORGANIZER ACTIONS
    function cancelEvent(uint256 eventId) external {
        EventRegistry.Event memory evt = registry.getEvent(eventId);
        require(msg.sender == evt.organizer || msg.sender == owner(), "Not authorized");
        require(!fundsWithdrawn[eventId], "Funds already withdrawn");
        
        eventCancelled[eventId] = true;
        emit EventCancelled(eventId);
    }

    function withdrawFunds(uint256 eventId) external {
        EventRegistry.Event memory evt = registry.getEvent(eventId);
        require(msg.sender == evt.organizer, "Not organizer");
        require(!eventCancelled[eventId], "Event cancelled");
        require(!fundsWithdrawn[eventId], "Already withdrawn");
        
        // Simple check: assume 1 day after event date for withdrawal
        // require(block.timestamp > evt.date + 1 days, "Event not concluded");

        uint256 amount = escrowBalance[eventId];
        escrowBalance[eventId] = 0;
        fundsWithdrawn[eventId] = true;

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "Failed to send Ether");
        
        emit FundsWithdrawn(eventId, amount);
    }

    // USER ACTIONS
    function claimRefund(uint256 tokenId) external {
        TicketMetadata storage ticket = tickets[tokenId];
        require(ownerOf(tokenId) == msg.sender, "Not ticket owner");
        require(eventCancelled[ticket.eventId], "Event not cancelled");
        require(ticket.price > 0, "Already refunded or free");

        uint256 refundAmount = ticket.price;
        ticket.price = 0; // Prevent re-entrancy / double refund (simple marker)
        _burn(tokenId); // Burn the ticket

        (bool sent, ) = payable(msg.sender).call{value: refundAmount}("");
        require(sent, "Failed to send Refund");
        
        emit RefundClaimed(tokenId, msg.sender, refundAmount);
    }
    
    // BACKEND / LEGACY MINT (If needed, updated to deposit directly if value sent, or just free mint)
    function mintTicket(
        address to,
        uint256 eventId,
        uint256 price,
        bool requiresAgeVerification,
        uint256 requiredAge
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = ticketCounter++;
        _safeMint(to, tokenId);
        tickets[tokenId] = TicketMetadata({
            eventId: eventId,
            price: price,
            attended: false,
            resold: false,
            originalPrice: price,
            requiresAgeVerification: requiresAgeVerification,
            requiredAge: requiredAge
        });
        
        emit TicketMinted(to, eventId, tokenId);
        return tokenId;
    }
    
    function verifyAttendance(uint256 tokenId, bool ageVerified) external {
        require(verifiers[msg.sender], "Not authorized");
        require(ownerOf(tokenId) != address(0), "Ticket not found");
        
        if (tickets[tokenId].requiresAgeVerification) {
            require(ageVerified, "Age verification required");
        }
        
        tickets[tokenId].attended = true;
        emit TicketVerified(tokenId, true);
    }
    
    function setVerifier(address verifier, bool status) external onlyOwner {
        verifiers[verifier] = status;
    }
    
    function getTicketMetadata(uint256 tokenId) external view returns (TicketMetadata memory) {
        return tickets[tokenId];
    }
}
