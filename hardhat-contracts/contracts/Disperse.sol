// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Disperse is Ownable {
    constructor() Ownable(msg.sender) {}

    function disperseToken(IERC20 token, address[] calldata recipients, uint256[] calldata values) external onlyOwner {
        require(recipients.length == values.length, "Disperse: recipients and values length mismatch");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < values.length; i++) {
            totalAmount += values[i];
        }

        require(token.balanceOf(address(this)) >= totalAmount, "Disperse: insufficient token balance");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(token.transfer(recipients[i], values[i]), "Disperse: token transfer failed");
        }
    }
}
