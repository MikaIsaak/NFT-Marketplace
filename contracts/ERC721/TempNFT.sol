// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MyNFTContract is ERC721 {
    using SafeERC20 for IERC20;

    constructor() ERC721("My NFT", "MNFT") {}

    uint256 tokenId;

    function mint(address to) external {
        tokenId++;
        _mint(to, tokenId);
    }
}