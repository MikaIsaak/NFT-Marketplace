// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IMarketplace {
    function mint() external;

    function purchaseItem(uint256 _tokenId, uint256 _amount) external;

    function listItem(uint256 _tokenId, uint256 _price) external;

    function removeListing(uint256 _tokenId) external;

    function getTotalPrice(uint256 _itemID) external view returns (uint);
}
