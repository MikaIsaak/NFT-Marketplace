// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../ERC721/TempNFT.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Marketplace is ReentrancyGuard {
    MyNFTContract nft;
    address payable private immutable feeAccount;
    uint8 public immutable feePercent;
    uint i;
    uint248 private itemCount;
    IERC20 public immutable USDT;
    IERC20 public immutable USDC;
    mapping(uint => Item) public items;

    struct Item {
        uint itemId;
        IERC721 nft;
        uint tokenId;
        uint price;
        address payable seller;
        bool onSale;
    }

    event Received(address indexed, uint indexed);

    event Offered(
        uint itemId,
        address indexed nft,
        uint tokenId,
        uint price,
        address indexed seller
    );

    event Bought(
        uint itemId,
        address indexed nft,
        uint tokenId,
        uint price,
        address indexed seller,
        address indexed buyer
    );

    error UnsuccessfullySendFunds();

    modifier onlyNftOwner(address addr, uint _tokenId) {
        require(nft.ownerOf(_tokenId) == addr, "You aren't owner of the token");
        _;
    }

    constructor(uint8 _feePercent, address addr, address _USDT, address _USDC) {
        require(
            _feePercent < 100,
            "It's unsual big comission, please, change it"
        );

        feeAccount = payable(msg.sender);
        feePercent = _feePercent;
        nft = MyNFTContract(addr);
        USDT = IERC20(_USDT);
        USDC = IERC20(_USDC);
    }

    receive() external payable {
        (bool sent, ) = msg.sender.call{value: msg.value}("");
        require(sent, "Failed to send Ether");
    }

    function mint() external {
        nft.mint(msg.sender);
    }

    function listItem(
        uint _tokenId,
        uint _price,
        IERC20 _token
    ) external onlyNftOwner(msg.sender, _tokenId) {
        require(_price > 0, "Price must be greater than zero");
        require(
            nft.getApproved(_tokenId) == address(this) ||
                nft.isApprovedForAll(msg.sender, address(this)),
            "You havent approved NFT for this contract"
        );
        require(
            _token == USDC || _token == USDT,
            "We dont accept this token for a payment"
        );

        itemCount++;
        items[itemCount] = Item(
            itemCount,
            nft,
            _tokenId,
            _price,
            payable(msg.sender),
            true
        );

        emit Offered(itemCount, address(nft), _tokenId, _price, msg.sender);
    }

    function purchaseItem(uint _itemId, IERC20 _token) external payable {
        Item storage item = items[_itemId];
        require(_itemId > 0 && _itemId <= itemCount, "item doesn't exist");
        require(item.onSale, "Item isnt on sale");
        require(msg.sender != item.seller, "You cant buy NFT from yourself");
        require(
            _token == USDC || _token == USDT,
            "We dont accept this token for a payment"
        );

        uint _totalPrice = getTotalPrice(_itemId);
        require(
            _token.balanceOf(address(msg.sender)) >= _totalPrice,
            "Insufficient funds for buying NFT"
        );

        item.onSale = false;
        if (
            _transferFunds(
                _token,
                msg.sender,
                feeAccount,
                item.seller,
                _totalPrice,
                item.price
            )
        ) {
            _transferNFT(item.seller, msg.sender, item.tokenId);
        } else {
            item.onSale = true;
            revert UnsuccessfullySendFunds();
        }

        emit Bought(
            _itemId,
            address(item.nft),
            item.tokenId,
            item.price,
            item.seller,
            msg.sender
        );
    }

    function removeListing(uint _itemId) external {
        require(_itemId > 0 && _itemId <= itemCount, "item doesn't exist");
        require(items[_itemId].seller == msg.sender, "You aren't the seller");
        require(items[_itemId].onSale, "This item isn't listed");

        items[_itemId].onSale = false;
    }

    function _transferNFT(address _from, address _to, uint _tokenId) internal {
        nft.transferFrom(_from, _to, _tokenId);
    }

    function _transferFunds(
        IERC20 _token,
        address _buyer,
        address _fee,
        address _seller,
        uint _totalPrice,
        uint _itemPrice
    ) internal returns (bool _isTransfered) {
        _token.transferFrom(_buyer, _seller, _itemPrice);

        _token.transferFrom(_buyer, _fee, _totalPrice - _itemPrice);

        return true;
    }

    function getTotalPrice(
        uint _itemId
    ) internal view returns (uint _totalPrice) {
        return ((items[_itemId].price * (100 + feePercent)) / 100);
    }
}
