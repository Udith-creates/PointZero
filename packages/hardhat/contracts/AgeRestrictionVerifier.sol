// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IZkProofVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[5] memory input
    ) external view returns (bool);
}

contract AgeRestrictionVerifier {
    IZkProofVerifier public zkProofVerifier;
    
    enum AgeRestriction { NONE, AGE_18, AGE_21, AGE_25 }
    
    // Maps (userAddress, eventId) => verified age group
    mapping(address => mapping(uint256 => bool)) public isAgeVerified;
    
    // Maps (userAddress, eventId) => ZK proof hash (for audit trail)
    mapping(address => mapping(uint256 => bytes32)) public proofHash;
    
    event AgeVerificationSuccessful(
        address indexed user,
        uint256 indexed eventId,
        AgeRestriction ageGroup
    );
    
    constructor(address _zkProofVerifier) {
        zkProofVerifier = IZkProofVerifier(_zkProofVerifier);
    }
    
    /**
     * Verify age via zero-knowledge proof
     * Input[0] = aadharHash
     * Input[1] = publicAgeGroup (0, 1, 2, 3)
     * Input[2] = isAdult
     * Input[3] = ageGroupCommit
     * Input[4] = currentTimestamp
     */
    function verifyAge(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[5] memory input, // Updated to 5 public signals
        uint256 eventId,
        AgeRestriction requiredAgeGroup
    ) external returns (bool) {
        // Verify ZK proof
        require(
            zkProofVerifier.verifyProof(a, b, c, input),
            "Invalid age proof"
        );
        
        // Verify event age requirement
        uint256 provedAgeGroup = input[1];
        require(provedAgeGroup >= uint256(requiredAgeGroup), "Age requirement not met");
        
        // Mark user as verified (without storing age or Aadhaar)
        isAgeVerified[msg.sender][eventId] = true;
        
        // Store proof hash for audit trail
        proofHash[msg.sender][eventId] = keccak256(
            abi.encode(a, b, c, input)
        );
        
        emit AgeVerificationSuccessful(
            msg.sender,
            eventId,
            AgeRestriction(provedAgeGroup)
        );
        
        return true;
    }
    
    /**
     * Check if user is age-verified for an event
     * Returns true/false without revealing age
     */
    function isVerifiedForEvent(address user, uint256 eventId) 
        external 
        view 
        returns (bool) 
    {
        return isAgeVerified[user][eventId];
    }
}
