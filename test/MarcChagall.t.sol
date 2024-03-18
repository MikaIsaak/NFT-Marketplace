// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {MarcChagall} from "../contracts/ERC721/MarcChagall.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {DeployNFT} from "../scripts/deployNFT.s.sol";

contract MarcChagallTest is Test {
    MarcChagall private nft;
    address private deployer;
    address private user;

    function setUp() public {
        deployer = 0xC05da40E0017A98444FCf8708E747227113c6619;
        user = 0xB7D4D5D9b1EC80eD4De0A5D66f8C7f903A9a5AAe;
        DeployNFT deployNFT = new DeployNFT();
        nft = MarcChagall(deployNFT.run());
    }

    function test_InitializeERC721() public view {
        assertEq(nft.name(), "Marc Chagall");
        assertEq(nft.symbol(), "MC");
    }

    function testFailInitializeTwice() public {
        vm.expectRevert("Initializable: contract is already initialized");
        nft.initialize(deployer); // Attempt to initialize again should fail.
    }

    function testSafeMintAndTokenURI() public {
        vm.startPrank(deployer);
        nft.safeMint(user); // Mint a new token to the user.
        vm.stopPrank();

        uint256 tokenId = 0; // Assuming the first minted token has ID 0.
        string
            memory expectedURI = "ipfs://bafybeic4nffxipaekoennii4iwinlgoqpunyrilamqv3bykjgiyluuj5r4/0";
        assertEq(nft.tokenURI(tokenId), expectedURI); // Verify the tokenURI is as expected.
    }
}
