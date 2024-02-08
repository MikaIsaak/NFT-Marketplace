// contracts/GLDToken.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDC is ERC20 {
    constructor(uint256 amount) ERC20("USDC", "USDC") {
        _mint(msg.sender, amount);
    }
}