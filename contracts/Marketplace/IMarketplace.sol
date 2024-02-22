// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IMarketplace {
    function mint() external;

    function purchaseItem(uint256 _tokenId) external;

    function listItem(uint256 _tokenId, uint256 _price) external;

    function removeListing(uint256 _tokenId) external;

    function getTotalPrice(uint256 _itemID) external view returns (uint256);

    event Offered(
        uint256 indexed _tokenId,
        uint256 indexed _price,
        address indexed _seller
    );

    event Bought(
        uint256 indexed _itemId,
        uint256 indexed _price,
        address indexed _buyer
    );

    event BidCreated(
        uint256 indexed _tokenId,
        address indexed _buyer,
        uint256 indexed _price
    );

    event BidAccepted(
        uint256 indexed _tokenId,
        address indexed _buyer,
        address _seller,
        uint256 indexed _price
    );

    event BidCanceled(
        uint256 indexed _tokenId,
        address indexed _buyer,
        uint256 indexed _price
    );
    struct Item {
        uint256 price;
        address payable seller;
        bool onSale;
    }

    struct Bid {
        address buyer;
        uint256 price;
    }
}
