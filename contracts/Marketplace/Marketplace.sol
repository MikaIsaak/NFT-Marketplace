// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {MarcChagall} from "../ERC721/MarcChagall.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {IMarketplace} from "./IMarketplace.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract Marketplace is Initializable, IMarketplace, EIP712Upgradeable {
    using SafeERC20 for IERC20;

    MarcChagall public nft;
    address private feeReceiver;
    uint8 public feePercent;
    IERC20 public USDC;
    mapping(uint256 => Item) public items;
    mapping(uint256 => Bid[]) public bids;
    mapping(address => uint256) private _nonces;
    mapping(bytes32 => bool) hashesOfTX;

    bytes32 private constant _PERMIT_TYPEHASH =
        keccak256(
            "Bid(address buyer,address seller,uint256 price, uint256 tokenId, uint256 nonce,uint256 deadline)"
        );

    modifier onlyNftOwner(address _ownerAddress, uint256 _tokenId) {
        require(
            nft.ownerOf(_tokenId) == _ownerAddress,
            "You aren't owner of the token"
        );
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    // QUESTION
    constructor() {
        _disableInitializers();
    }

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
        __EIP712_init("Marketplace", "1");
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

        emit Offered(_tokenId, _price, msg.sender);
    }

    function purchaseItem(uint256 _tokenId) external {
        Item storage item = items[_tokenId];
        require(item.onSale, "Item isn't on sale");
        require(msg.sender != item.seller, "You can't buy NFT from yourself");

        uint256 totalPrice = getTotalPrice(item.price);
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
        uint256 _price
    ) public view returns (uint256 _totalPrice) {
        return ((_price * (100 + feePercent)) / 100);
    }

    function acceptBid(
        address buyer,
        address seller,
        uint256 tokenId,
        uint256 price,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external virtual {
        require(block.timestamp <= deadline, "Expired bid");

        bytes32 structHash = keccak256(
            abi.encode(
                _PERMIT_TYPEHASH,
                buyer,
                seller,
                tokenId,
                price,
                _nonces[buyer],
                deadline
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);

        address signer = ECDSA.recover(hash, v, r, s);

        require(signer == buyer, "not an owner");
        _nonces[buyer]++;

        uint256 fee = getTotalPrice(price) - price;
        USDC.transferFrom(buyer, seller, price);
        USDC.transferFrom(buyer, feeReceiver, fee);
        nft.transferFrom(seller, buyer, tokenId);
    }

    function nonces(address buyer) external view returns (uint256) {
        return _nonces[buyer];
    }

    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
