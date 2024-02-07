// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMarketplace {
    function mint() external;

    function purchaseItem(uint _tokenId, uint _amount) external payable;

    function listItem(uint _tokenId, uint _price) external;

    function removeListing(uint _tokenId) external;

    function getTotalPrice(uint _itemID) external returns (uint);

    function _transferNFT(address _from, address _to, uint _tokenId) external;

    function _transferFunds(
        IERC20 token,
        address _buyer,
        address _fee,
        address _seller,
        uint _messageValue,
        uint _totalPrice,
        uint _itemPrice
    ) external returns (bool);
}
