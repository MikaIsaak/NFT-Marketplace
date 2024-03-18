// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Marketplace} from "../contracts/Marketplace/Marketplace.sol";
import {Script} from "../lib/forge-std/src/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {DeployNFT} from "./deployNFT.s.sol";

// import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

contract DeployMarketplace is Script {
    function run() external returns (address) {
        address proxy = deployCounter();
        return proxy;
    }

    function deployCounter() public returns (address) {
        vm.startBroadcast(
            0x46f32959177c97dc0d0c36d6a1e166af8861e43c15a51a3812159f84e26f3ffd
        );
        Marketplace marketplace = new Marketplace();
        DeployNFT deployNFT = new DeployNFT();

        bytes memory data = abi.encodeCall(
            marketplace.initialize,
            (10, deployNFT.run(), 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238)
        );

        ERC1967Proxy proxy = new ERC1967Proxy(address(marketplace), data);
        vm.stopBroadcast();
        return address(proxy);
    }
}
