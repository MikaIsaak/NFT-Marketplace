// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {MarcChagall} from "../ERC721/MarcChagall.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IMarketplace} from "./IMarketplace.sol";
import {Marketplace} from "./Marketplace.sol";

contract Hack {
    IERC721 nft;
    Marketplace mc;
    IERC20 USDC;

    constructor(
        address payable contractAddress,
        address _UsdcAddrUsdcAddr,
        address nftAddress
    ) {
        mc = Marketplace(contractAddress);
        USDC = IERC20(_UsdcAddrUsdcAddr);
        nft = IERC721(nftAddress);
    }

    function buyAndSellItem() external {
        mc.mint();
        nft.setApprovalForAll(address(mc), true);
    }

    receive() external payable {}
}
