// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {MarcChagall} from "../ERC721/MarcChagall.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IMarketplace} from "./IMarketplace.sol";

contract Marketplace is Initializable, IMarketplace {
    using SafeERC20 for IERC20;

    MarcChagall public nft;
    address private feeReceiver;
    uint8 public feePercent;
    uint256 private itemCount;
    IERC20 public USDC;
    mapping(uint256 => Item) public items;
    mapping(uint256 => Bid[]) public bids;
    mapping(uint256 => uint256) public bidsCounter;

    modifier onlyNftOwner(address _ownerAddress, uint256 _tokenId) {
        require(
            nft.ownerOf(_tokenId) == _ownerAddress,
            "You aren't owner of the token"
        );
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        uint8 _feePercent,
        address _nftAddress,
        address _USDC
    ) public initializer {
        require(
            _feePercent < 100,
            "It's unsual big comission, please, change it"
        );

        feeReceiver = payable(msg.sender);
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
        require(_price != 0, "Price shouldn't be equal zero");
        require(
            nft.getApproved(_tokenId) == address(this) ||
                nft.isApprovedForAll(msg.sender, address(this)),
            "You haven't approved NFT for this contract"
        );

        items[_tokenId] = Item(_price, payable(msg.sender), true);

        emit Offered(itemCount, _price, msg.sender);
    }

    function purchaseItem(uint256 _tokenId) external {
        Item storage item = items[_tokenId];
        require(item.onSale, "Item isn't on sale");
        require(msg.sender != item.seller, "You can't buy NFT from yourself");

        uint256 totalPrice = getTotalPrice(_tokenId);
        require(
            USDC.balanceOf(msg.sender) >= totalPrice,
            "Insufficient funds for buying NFT"
        );

        item.onSale = false;

        USDC.safeTransferFrom(msg.sender, item.seller, item.price);

        USDC.safeTransferFrom(msg.sender, feeReceiver, totalPrice - item.price);

        nft.safeTransferFrom(item.seller, msg.sender, _tokenId);

        emit Bought(_tokenId, item.price, msg.sender);
    }

    function removeListing(uint256 _itemId) external {
        require(items[_itemId].seller == msg.sender, "You aren't the seller");
        require(items[_itemId].onSale, "This item isn't listed");

        items[_itemId].onSale = false;
    }

    function getTotalPrice(
        uint256 _tokenId
    ) public view returns (uint256 _totalPrice) {
        return ((items[_tokenId].price * (100 + feePercent)) / 100);
    }

    // Bid interface
    function createBid(uint256 _tokenId, uint256 _price) external {
        // require(
        //     USDC.balanceOf(msg.sender) >= _price,
        //     "Insufficient funds for buying NFT"
        // );
        // error
        require(
            nft.ownerOf(_tokenId) != address(0),
            "Nft with this item doesn't exist"
        );
        require(_price != 0, "Price shouldn't be equal zero");

        // creates a new one
        bids[_tokenId][bidsCounter[_tokenId]] = Bid(msg.sender, _price);
        bidsCounter[_tokenId]++;
    }

    function acceptBid(uint256 _tokenId, uint256 _offerId) external {
        require(
            nft.ownerOf(_tokenId) == msg.sender,
            "You aren't owner of the NFT you want to sell"
        );
        require(bids[_tokenId][_offerId].price != 0, "This bid doesn't exist");
        require(nft.ownerOf(_tokenId) != address(0));

        if (items[_tokenId].onSale) {
            items[_tokenId].onSale = false;
        }

        delete bids[_tokenId][_offerId];
    }

    function cancelBid(uint256 _tokenId, uint256 _offerId) external {
        require(
            bids[_tokenId][_offerId].buyer == msg.sender,
            "You can't cancel not your bid"
        );
        delete bids[_tokenId][_offerId];
    }

    function getBids(uint256 _tokenId) external view returns (Bid[] memory) {
        return bids[_tokenId];
    }
}
