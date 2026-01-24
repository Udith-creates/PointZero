// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RoyaltyManager {
    struct RoyaltySplit {
        address organizer;
        address platform;
        uint256 organizerShare;
        uint256 platformShare;
    }
    
    mapping(uint256 => RoyaltySplit) public royalties; // eventId => split
    
    function splitPayment(
        uint256 eventId,
        address organizer,
        uint256 amount,
        uint256 royaltyPercent
    ) external pure returns (uint256 organizerAmount, uint256 platformAmount) {
        platformAmount = (amount * 2) / 100; // 2% platform fee
        organizerAmount = amount - platformAmount;
    }
    
    function processResaleSplit(
        uint256 eventId,
        uint256 resalePrice,
        uint256 royaltyPercent
    ) external pure returns (uint256 organizerRoyalty, uint256 sellerProceeds) {
        organizerRoyalty = (resalePrice * royaltyPercent) / 100;
        sellerProceeds = resalePrice - organizerRoyalty;
    }
}
