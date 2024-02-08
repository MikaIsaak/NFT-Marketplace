// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {MyNFTContract} from "../ERC721/TempNFT.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Marketplace is ReentrancyGuard {
    MyNFTContract nft;
    address payable private immutable feeAccount;
    uint8 public immutable feePercent;
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

    modifier onlyNftOwner(address ownerAddress, uint256 _tokenId) {
        require(nft.ownerOf(_tokenId) == ownerAddress, "You aren't owner of the token");
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

    receive() external payable {}

    function mint() external {
        nft.mint(msg.sender);
    }

    function listItem(
        uint256 _tokenId,
        uint256 _price,
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

    function purchaseItem(uint256 _itemId, IERC20 _token) external payable {
        Item storage item = items[_itemId];
        require(_itemId > 0 && _itemId <= itemCount, "Item doesn't exist");
        require(item.onSale, "Item isn't on sale");
        require(msg.sender != item.seller, "You can't buy NFT from yourself");
        require(
            _token == USDC || _token == USDT,
            "We don't accept this token for a payment"
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

    function removeListing(uint256 _itemId) external {
        require(_itemId > 0 && _itemId <= itemCount, "Item doesn't exist");
        require(items[_itemId].seller == msg.sender, "You aren't the seller");
        require(items[_itemId].onSale, "This item isn't listed");

        items[_itemId].onSale = false;
    }

    function _transferNFT(address _from, address _to, uint256 _tokenId) internal {
        nft.transferFrom(_from, _to, _tokenId);
    }

    function _transferFunds(
        IERC20 _token,
        address _buyer,
        address _fee,
        address _seller,
        uint256 _totalPrice,
        uint256 _itemPrice
    ) internal returns (bool _isTransfered) {
        _token.transferFrom(_buyer, _seller, _itemPrice);

        _token.transferFrom(_buyer, _fee, _totalPrice - _itemPrice);

        return true;
    }

    function getTotalPrice(
        uint256 _itemId
    ) internal view returns (uint256 _totalPrice) {
        return ((items[_itemId].price * (100 + feePercent)) / 100);
    }
}