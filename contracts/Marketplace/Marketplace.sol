// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {MarcChagall} from "../ERC721/MarcChagall.sol";

import {IMarketplace} from "./IMarketplace.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import {console} from "hardhat/console.sol";

/// @title NFT Marketplace for buying and selling NFTs of Marc Chagall
/// @author Mikael Isayan
/// @notice Contract is made only for Marc Chagall NFTs
contract Marketplace is Initializable, IMarketplace, EIP712Upgradeable {
    using SafeERC20 for IERC20;

    /// @notice Address of NFT contract
    MarcChagall public nft;
    address private feeReceiver;
    /// @notice Percent of fee to Marketplace
    uint8 public feePercent;
    /// @notice Address of USDC contract
    IERC20 public USDC;
    /// @notice Mapping of items
    mapping(uint256 => Item) public items;
    /// @dev Nonce should be incremented for the next signature, regardless of what inside
    mapping(address => uint256) private _nonces;
    /// @dev Type hash for Bid signature
    /// used in signature recovering and checking process
    bytes32 internal constant BID_TYPE_HASH =
        keccak256(
            "Bid(address buyer,uint256 tokenId,uint256 price,uint256 deadline,uint256 nonce)"
        );

    ///@dev Used to prevent from making decisions by not exact NFT owner
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

    /// @notice Initializing function due to using Transparent proxy
    /// @param _feePercent Fee is paying to marketplace
    /// @param _nftAddress Address of Marc Chagall NFT
    /// @param _USDC Token we used for buying/selling NFT and paying comission
    function initialize(
        uint8 _feePercent,
        address _nftAddress,
        address _USDC
    ) external initializer {
        require(
            _feePercent < 100,
            "It's unsual big comission, please, change it"
        );

        feeReceiver = payable(msg.sender);
        feePercent = _feePercent;
        nft = MarcChagall(_nftAddress);
        USDC = IERC20(_USDC);
        // used to initialize EIP712
        __EIP712_init("Marketplace", "1");
    }

    receive() external payable {}

    ///@notice Minting NFT for message sender
    function mint() external {
        nft.safeMint(msg.sender);
    }

    /// @notice Listing the NFT, which should be already minted
    /// @param _tokenId ID of minted NFT
    /// @param _price Price without marketplace fee
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

        emit Offered(_tokenId, _price, msg.sender);
    }

    /// @notice Buying NFT with exactly number
    /// @param _tokenId Token ID of buying NFT
    function purchaseItem(uint256 _tokenId) external {
        Item storage item = items[_tokenId];
        require(item.onSale, "Item isn't on sale");
        require(msg.sender != item.seller, "You can't buy NFT from yourself");

        uint256 totalPrice = getTotalPrice(item.price);
        require(
            USDC.balanceOf(msg.sender) >= totalPrice,
            "Insufficient funds for buying NFT"
        );

        // Used to prevent re-entrancy pattern
        item.onSale = false;

        USDC.safeTransferFrom(msg.sender, item.seller, item.price);

        USDC.safeTransferFrom(msg.sender, feeReceiver, totalPrice - item.price);

        nft.safeTransferFrom(item.seller, msg.sender, _tokenId);

        emit Bought(_tokenId, item.price, msg.sender);
    }

    /// @notice Removing listing of exact NFT
    /// @param _itemId Token ID of NFT we want to delist
    function removeListing(uint256 _itemId) external {
        require(items[_itemId].seller == msg.sender, "You aren't the seller");
        require(items[_itemId].onSale, "This item isn't listed");

        items[_itemId].onSale = false;
    }

    /// @dev Using for calculating full price of NFT (including Marketplace fee)
    /// @param _price Price of the item
    function getTotalPrice(
        uint256 _price
    ) public view returns (uint256 _totalPrice) {
        return ((_price * (100 + feePercent)) / 100);
    }

    /// @notice Accepting bid by seller using off-chain signature by buyer
    /// @param buyer Buyer of the NFT(signer)
    /// @param tokenId ID of the NFT we want to buy/sell
    /// @param price Price for NFT (without comission)
    /// @param deadline Deadline of bid
    /// @param v Element of signature
    /// @param r Element of signature
    /// @param s Element of signature
    function acceptBid(
        address buyer,
        uint256 tokenId,
        uint256 price,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external onlyNftOwner(msg.sender, tokenId) {
        require(block.timestamp <= deadline, "Time for this bid expired");
        require(
            USDC.balanceOf(buyer) >= getTotalPrice(price),
            "Bidder don't have enough balance to pay for this bid"
        );

        //recovering signature inside our contract
        bytes32 hash = keccak256(
            abi.encode(
                BID_TYPE_HASH,
                buyer,
                tokenId,
                price,
                deadline,
                getNonce(buyer)
            )
        );
        bytes32 digest = _hashTypedDataV4(hash);
        address signer = ECDSA.recover(digest, v, r, s);
        require(signer == buyer, "Invalid signature");

        if (items[tokenId].onSale) {
            items[tokenId].onSale = false;
        }

        uint256 fee = getTotalPrice(price) - price;

        USDC.safeTransferFrom(buyer, msg.sender, price);

        USDC.safeTransferFrom(buyer, feeReceiver, fee);

        nft.safeTransferFrom(msg.sender, buyer, tokenId);

        emit BidAccepted(tokenId, buyer, msg.sender, price);
    }

    ///@dev Returning current nonce and increments it
    ///@param _user User we use for checking his current nonce in mapping
    function getNonce(address _user) internal returns (uint256 nonce) {
        nonce = _nonces[_user];
        _nonces[_user]++;
    }

    ///@dev Used to limit use of signatures from other networks
    ///@return _domainSeparatorV4 hashed information about this contract, chain, etc.
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
