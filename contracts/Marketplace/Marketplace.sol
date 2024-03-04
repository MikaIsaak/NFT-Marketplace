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

import "hardhat/console.sol";

contract Marketplace is Initializable, IMarketplace, EIP712Upgradeable {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    MarcChagall public nft;
    address private feeReceiver;
    uint8 public feePercent;
    IERC20 public USDC;
    mapping(uint256 => Item) public items;
    mapping(address => uint256) private _nonces;
    mapping(bytes32 => bool) hashesOfTX;

    bytes32 internal constant WHITELABEL_TYPE_HASH =
        keccak256(
            "AcceptBid(address buyer,uint256 tokenId,uint256 price,uint256 deadline)"
        );

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

    //EIP712 PART

    // struct BidAccept {
    //     address buyer;
    //     uint256 tokenId;
    //     uint256 price;
    //     uint256 deadline;
    //     bytes signature;
    // }

    // function recover(
    //     BidAccept calldata bidInfo
    // ) public view returns (address signer) {
    //     bytes32 digest = _hashTypedDataV4(
    //         keccak256(
    //             abi.encode(
    //                 keccak256(
    //                     "BidAccept(address buyer,uint256 tokenId,uint256 price,uint256 deadline)"
    //                 ),
    //                 bidInfo.buyer,
    //                 bidInfo.tokenId,
    //                 bidInfo.price,
    //                 bidInfo.deadline
    //             )
    //         )
    //     );
    //     signer = ECDSA.recover(digest, bidInfo.signature);
    //     console.log(signer);
    //     return signer;
    // }

    function verifySignature(
        address buyer,
        uint256 tokenId,
        uint256 price,
        uint256 deadline,
        bytes calldata signature
    ) internal view returns (bool) {
        address signer = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    WHITELABEL_TYPE_HASH,
                    buyer,
                    tokenId,
                    price,
                    deadline
                )
            )
        ).recover(signature);
        return signer == buyer;
    }

    function acceptBid(
        address buyer,
        uint256 tokenId,
        uint256 price,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(deadline <= block.timestamp, "You are late");
        require(
            USDC.balanceOf(buyer) >= getTotalPrice(price),
            "Not enough balance"
        );
        require(
            verifySignature(buyer, tokenId, price, deadline, signature),
            "Incorrect signature"
        );

        if (items[tokenId].onSale) {
            items[tokenId].onSale = false;
        }

        uint256 fee = getTotalPrice(price) - price;

        USDC.safeTransferFrom(buyer, msg.sender, price);

        USDC.safeTransferFrom(buyer, feeReceiver, fee);

        nft.safeTransferFrom(msg.sender, buyer, tokenId);

        emit BidAccepted(tokenId, buyer, msg.sender, price);
    }
}
