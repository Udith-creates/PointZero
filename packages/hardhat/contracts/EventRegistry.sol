// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EventRegistry {
    enum AgeRestriction { NONE, AGE_18, AGE_21, AGE_25 }
    
    struct Event {
        uint256 eventId;
        address organizer;
        string name;
        string location;
        uint256 date;
        uint256 price;
        uint256 capacity;
        uint256 ticketsSold;
        string imageURI;
        bool active;
        uint256 royaltyPercent;
        AgeRestriction ageRestriction; // NEW: Age requirement
        bool requiresAgeVerification; // NEW: Is ZK proof needed?
    }
    
    mapping(uint256 => Event) public events;
    uint256 public eventCounter;
    
    event EventCreated(
        uint256 indexed eventId, 
        address indexed organizer, 
        string name,
        AgeRestriction ageRestriction
    );
    event EventUpdated(uint256 indexed eventId);
    
    function createEvent(
        string memory name,
        string memory location,
        uint256 date,
        uint256 price,
        uint256 capacity,
        string memory imageURI,
        uint256 royaltyPercent,
        AgeRestriction ageRestriction  // NEW parameter
    ) external returns (uint256) {
        require(royaltyPercent >= 5 && royaltyPercent <= 15, "Royalty 5-15%");
        
        uint256 eventId = eventCounter++;
        bool requiresAge = ageRestriction != AgeRestriction.NONE;
        
        events[eventId] = Event({
            eventId: eventId,
            organizer: msg.sender,
            name: name,
            location: location,
            date: date,
            price: price,
            capacity: capacity,
            ticketsSold: 0,
            imageURI: imageURI,
            active: true,
            royaltyPercent: royaltyPercent,
            ageRestriction: ageRestriction,
            requiresAgeVerification: requiresAge
        });
        
        emit EventCreated(eventId, msg.sender, name, ageRestriction);
        return eventId;
    }
    
    function updateEvent(
        uint256 eventId,
        string memory name,
        string memory location,
        string memory imageURI,
        AgeRestriction ageRestriction
    ) external {
        require(events[eventId].organizer == msg.sender, "Not organizer");
        events[eventId].name = name;
        events[eventId].location = location;
        events[eventId].imageURI = imageURI;
        events[eventId].ageRestriction = ageRestriction;
        events[eventId].requiresAgeVerification = ageRestriction != AgeRestriction.NONE;
        emit EventUpdated(eventId);
    }
    
    function getEvent(uint256 eventId) 
        external 
        view 
        returns (Event memory) 
    {
        return events[eventId];
    }
    
    function getAgeRequirement(uint256 eventId)
        external
        view
        returns (AgeRestriction)
    {
        return events[eventId].ageRestriction;
    }
}
