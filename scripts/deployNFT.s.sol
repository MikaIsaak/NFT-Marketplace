// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {MarcChagall} from "../contracts/ERC721/MarcChagall.sol";
import {Script} from "../lib/forge-std/src/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

contract DeployNFT is Script {
    function run() external returns (address) {
        address proxy = deployCounter();
        return proxy;
    }

    function deployCounter() public returns (address) {
        // vm.startBroadcast(
        //     0x46f32959177c97dc0d0c36d6a1e166af8861e43c15a51a3812159f84e26f3ffd
        // );
        MarcChagall nft = new MarcChagall();

        bytes memory data = abi.encodeCall(
            MarcChagall.initialize,
            (0xC05da40E0017A98444FCf8708E747227113c6619)
        );

        ERC1967Proxy proxy = new ERC1967Proxy(address(nft), data);
        // vm.stopBroadcast();
        return address(proxy);
    }
}
