// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MergedContract
 * @dev Combines event creation and ticket issuance with privacy-preserving features
 */
contract MergedContract is ERC721, Ownable, ReentrancyGuard {
    uint256 private _nextTokenId;
    uint256 private _nextEventId;

    enum EventStatus { Active, Completed, Cancelled }

    struct Event {
        uint256 eventId;
        address organizer;
        string name;
        string description;
        string imageCID;
        uint256 startTime;
        uint256 endTime;
        string venueName;
        string streetAddress;
        string city;
        string state;
        string postalCode;
        string country;
        bool isOnline;
        uint256 ticketPrice;
        uint256 maxAttendees;
        uint256 ticketsSold;
        EventStatus status;
        bool isPrivate;
    }

    // Event storage
    mapping(uint256 => Event) public events;
    mapping(address => uint256[]) public organizerEvents;

    // Ticket management
    mapping(uint256 => uint256) private ticketToEvent; // tokenId => eventId
    mapping(bytes32 => uint256[]) private userTickets; // hash1 => tokenIds
    mapping(bytes32 => bool) private ticketExists; // hash2 => exists
    mapping(uint256 => mapping(bytes32 => bool)) private eventTickets; // eventId => hash1 => has ticket
    mapping(bytes32 => uint256[]) public userEvents; // hash1 => eventIds
    mapping(bytes32 => uint256) public ticketHashes; // hash2 => tokenId

    // Events
    event EventCreated(
        uint256 indexed eventId,
        address indexed organizer,
        string name,
        uint256 startTime,
        uint256 endTime,
        uint256 ticketPrice,
        uint256 maxAttendees
    );
    event EventCancelled(uint256 indexed eventId);
    event EventCompleted(uint256 indexed eventId);
    event TicketIssued(uint256 indexed tokenId, uint256 indexed eventId, bytes32 indexed hash1);
    event TicketBurned(uint256 indexed tokenId, uint256 indexed eventId);
    event RefundIssued(address indexed to, uint256 indexed eventId, uint256 amount);

    // Custom errors
    error InvalidEventId(uint256 eventId);
    error EventNotActive(uint256 eventId);
    error TicketAlreadyExists(bytes32 hash2);
    error InvalidHash();
    error EventNotFound();
    error UnauthorizedAccess();
    error EventAlreadyEnded();
    error InsufficientPayment();
    error EventSoldOut();
    error RefundFailed();

    constructor() ERC721("EventTicket", "TCKT") Ownable(msg.sender) {
        _nextTokenId = 1;
        _nextEventId = 1;
    }

    /**
     * @dev Creates a new event
     */
    function createEvent(
        string memory name,
        string memory description,
        string memory imageCID,
        uint256 startTime,
        uint256 endTime,
        string memory venueName,
        string memory streetAddress,
        string memory city,
        string memory state,
        string memory postalCode,
        string memory country,
        bool isOnline,
        uint256 ticketPrice,
        uint256 maxAttendees,
        bool isPrivate
    ) external returns (uint256) {
        require(startTime > block.timestamp, "Start time must be in the future");
        require(endTime > startTime, "End time must be after start time");
        require(maxAttendees > 0, "Max attendees must be greater than 0");

        uint256 eventId = _nextEventId++;

        events[eventId] = Event({
            eventId: eventId,
            organizer: msg.sender,
            name: name,
            description: description,
            imageCID: imageCID,
            startTime: startTime,
            endTime: endTime,
            venueName: venueName,
            streetAddress: streetAddress,
            city: city,
            state: state,
            postalCode: postalCode,
            country: country,
            isOnline: isOnline,
            ticketPrice: ticketPrice,
            maxAttendees: maxAttendees,
            ticketsSold: 0,
            status: EventStatus.Active,
            isPrivate: isPrivate
        });

        organizerEvents[msg.sender].push(eventId);

        emit EventCreated(
            eventId,
            msg.sender,
            name,
            startTime,
            endTime,
            ticketPrice,
            maxAttendees
        );

        return eventId;
    }

    /**
     * @dev Issues a new ticket NFT with payment
     */
    function purchaseTicket(
        bytes32 hash1,
        bytes32 hash2,
        uint256 eventId
    ) external payable nonReentrant returns (uint256) {
        Event storage eventDetails = events[eventId];
        
        if (hash1 == bytes32(0) || hash2 == bytes32(0)) revert InvalidHash();
        if (eventDetails.eventId == 0) revert EventNotFound();
        if (eventDetails.status != EventStatus.Active) revert EventNotActive(eventId);
        if (block.timestamp >= eventDetails.endTime) revert EventAlreadyEnded();
        if (eventDetails.ticketsSold >= eventDetails.maxAttendees) revert EventSoldOut();
        if (msg.value != eventDetails.ticketPrice) revert InsufficientPayment();
        if (ticketExists[hash2]) revert TicketAlreadyExists(hash2);
        if (eventTickets[eventId][hash1]) revert TicketAlreadyExists(hash2);

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);

        // Update ticket mappings
        ticketExists[hash2] = true;
        eventTickets[eventId][hash1] = true;
        userTickets[hash1].push(tokenId);
        ticketToEvent[tokenId] = eventId;
        ticketHashes[hash2] = tokenId;
        userEvents[hash1].push(eventId);
        eventDetails.ticketsSold++;

        // Transfer payment to event organizer
        (bool sent, ) = payable(eventDetails.organizer).call{value: msg.value}("");
        require(sent, "Failed to send payment to organizer");

        emit TicketIssued(tokenId, eventId, hash1);
        return tokenId;
    }

    /**
     * @dev Cancels an event and enables refunds
     */
    function cancelEvent(uint256 eventId) external {
        Event storage eventDetails = events[eventId];
        if (eventDetails.eventId == 0) revert EventNotFound();
        if (msg.sender != eventDetails.organizer && msg.sender != owner()) revert UnauthorizedAccess();
        if (eventDetails.status != EventStatus.Active) revert EventNotActive(eventId);

        eventDetails.status = EventStatus.Cancelled;
        emit EventCancelled(eventId);
    }

    /**
     * @dev Burns a ticket and issues refund if event is cancelled
     */
    function burnTicket(uint256 tokenId) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender || isApprovedForAll(ownerOf(tokenId), msg.sender), "Not token owner or approved");
        uint256 eventId = ticketToEvent[tokenId];
        Event storage eventDetails = events[eventId];
        
        if (eventDetails.eventId == 0) revert EventNotFound();
        
        // Only allow burning if event is cancelled or user initiated
        bool isCancelled = eventDetails.status == EventStatus.Cancelled;
        require(isCancelled || msg.sender == ownerOf(tokenId), "Cannot burn ticket");

        // Process refund if event was cancelled
        if (isCancelled) {
            (bool sent, ) = payable(ownerOf(tokenId)).call{value: eventDetails.ticketPrice}("");
            if (!sent) revert RefundFailed();
            emit RefundIssued(ownerOf(tokenId), eventId, eventDetails.ticketPrice);
        }

        // Burn the ticket
        _burn(tokenId);
        eventDetails.ticketsSold--;
        emit TicketBurned(tokenId, eventId);
    }

    /**
     * @dev Completes an event
     */
    function completeEvent(uint256 eventId) external {
        Event storage eventDetails = events[eventId];
        if (eventDetails.eventId == 0) revert EventNotFound();
        if (msg.sender != eventDetails.organizer && msg.sender != owner()) revert UnauthorizedAccess();
        if (eventDetails.status != EventStatus.Active) revert EventNotActive(eventId);
        if (block.timestamp < eventDetails.endTime) revert("Event not yet ended");

        eventDetails.status = EventStatus.Completed;
        emit EventCompleted(eventId);
    }

    // View functions
    function getEventDetails(uint256 eventId) external view returns (Event memory) {
        Event memory eventDetails = events[eventId];
        if (eventDetails.eventId == 0) revert EventNotFound();
        return eventDetails;
    }

    function getTicketsByUser(bytes32 hash1) external view returns (uint256[] memory) {
        if (hash1 == bytes32(0)) revert InvalidHash();
        return userTickets[hash1];
    }

    function getUserEvents(bytes32 hash1) external view returns (uint256[] memory) {
        if (hash1 == bytes32(0)) revert InvalidHash();
        return userEvents[hash1];
    }

    function verifyTicket(bytes32 hash2) external view returns (bool, uint256, uint256) {
        if (hash2 == bytes32(0)) revert InvalidHash();
        uint256 tokenId = ticketHashes[hash2];
        if (tokenId == 0) return (false, 0, 0);
        uint256 eventId = ticketToEvent[tokenId];
        return (true, tokenId, eventId);
    }

    // Override transfer functions to make tickets non-transferable
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0)) {
            revert("Tickets are non-transferable");
        }
        return super._update(to, tokenId, auth);
    }
} 