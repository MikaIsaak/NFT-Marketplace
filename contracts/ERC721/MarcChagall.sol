// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract MarcChagall is Initializable, ERC721Upgradeable, OwnableUpgradeable {
    uint256 private _nextTokenId;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        __ERC721_init("Marc Chagall", "MC");
        __Ownable_init(initialOwner);
    }

    function _baseURI() internal pure override returns (string memory) {
        return
            "ipfs://bafybeic4nffxipaekoennii4iwinlgoqpunyrilamqv3bykjgiyluuj5r4/";
    }

    function safeMint(address to) public {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
    }
}
