// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMarketplace {
    function mint() external;

    function purchaseItem(uint256 _tokenId, uint256 _amount) external;

    function listItem(uint256 _tokenId, uint256 _price) external;

    function removeListing(uint256 _tokenId) external;

    function getTotalPrice(uint256 _itemID) external view returns (uint);

    function _transferNFT(address _from, address _to, uint256 _tokenId) external;

    function _transferFunds(
        IERC20 token,
        address _buyer,
        address _fee,
        address _seller,
        uint256 _messageValue,
        uint256 _totalPrice,
        uint256 _itemPrice
    ) external returns (bool);
}