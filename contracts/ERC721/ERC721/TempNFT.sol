// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MyNFTContract is ERC721 {
    using SafeERC20 for IERC20;

    constructor() ERC721("My NFT", "MNFT") {}

    uint tokenId;

    function mint(address to) external {
        tokenId++;
        _mint(to, tokenId);
    }
}
