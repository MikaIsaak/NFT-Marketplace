// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {MarcChagall} from "../ERC721/MarcChagall.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Marketplace {
    MarcChagall nft;
    // payable??
    address payable private immutable feeAccount;
    uint8 public immutable feePercent;
    uint256 private itemCount;
    IERC20 public immutable USDC;
    mapping(uint256 => Item) public items;

    struct Item {
        uint itemId;
        uint tokenId;
        uint price;
        address payable seller;
        bool onSale;
    }

    event Offered(uint itemId, uint price, address indexed seller);

    event Bought(uint itemId, uint price, address indexed buyer);

    modifier onlyNftOwner(address _ownerAddress, uint256 _tokenId) {
        require(
            nft.ownerOf(_tokenId) == _ownerAddress,
            "You aren't owner of the token"
        );
        _;
    }

    constructor(uint8 _feePercent, address _nftAddress, address _USDC) {
        require(
            _feePercent < 100,
            "It's unsual big comission, please, change it"
        );

        feeAccount = payable(msg.sender);
        feePercent = _feePercent;
        nft = MarcChagall(_nftAddress);
        USDC = IERC20(_USDC);
    }

    receive() external payable {}

    function mint() external {
        nft.safeMint(msg.sender);
    }

    function listItem(
        uint256 _tokenId,
        uint256 _price
    ) external onlyNftOwner(msg.sender, _tokenId) {
        require(_price > 0, "Price shouldn't be equal zero");
        require(
            nft.getApproved(_tokenId) == address(this) ||
                nft.isApprovedForAll(msg.sender, address(this)),
            "You haven't approved NFT for this contract"
        );

        itemCount++;
        items[itemCount] = Item(
            itemCount,
            _tokenId,
            _price,
            payable(msg.sender),
            true
        );

        emit Offered(itemCount, _price, msg.sender);
    }

    function purchaseItem(uint256 _itemId) external {
        Item storage item = items[_itemId];
        require(item.onSale, "Item isn't on sale");
        require(msg.sender != item.seller, "You can't buy NFT from yourself");

        uint totalPrice = getTotalPrice(_itemId);
        require(
            USDC.balanceOf(msg.sender) >= totalPrice,
            "Insufficient funds for buying NFT"
        );

        item.onSale = false;

        USDC.transferFrom(msg.sender, item.seller, item.price);

        USDC.transferFrom(msg.sender, feeAccount, totalPrice - item.price);

        nft.transferFrom(item.seller, msg.sender, item.tokenId);

        emit Bought(_itemId, item.price, msg.sender);
    }

    function removeListing(uint256 _itemId) external {
        require(items[_itemId].seller == msg.sender, "You aren't the seller");
        require(items[_itemId].onSale, "This item isn't listed");

        items[_itemId].onSale = false;
    }

    function getTotalPrice(
        uint256 _itemId
    ) internal view returns (uint256 _totalPrice) {
        return ((items[_itemId].price * (100 + feePercent)) / 100);
    }
}
