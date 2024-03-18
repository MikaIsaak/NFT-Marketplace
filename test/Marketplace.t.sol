// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {MarcChagall} from "../contracts/ERC721/MarcChagall.sol";
import {Marketplace} from "../contracts/Marketplace/Marketplace.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {DeployMarketplace} from "../scripts/deployMarketplace.s.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract MarketplaceTest is Test {
    MarcChagall nft;
    IERC20 USDC;
    address deployer;
    address user;
    Marketplace marketplace;

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

    function setUp() public {
        deployer = 0xC05da40E0017A98444FCf8708E747227113c6619;
        user = 0xB7D4D5D9b1EC80eD4De0A5D66f8C7f903A9a5AAe;

        DeployMarketplace deployMarketplace = new DeployMarketplace();
        marketplace = Marketplace(payable(deployMarketplace.run()));
        nft = marketplace.nft();
        USDC = marketplace.USDC();

        vm.startBroadcast(deployer);
        nft.setApprovalForAll(address(marketplace), true);
        USDC.approve(address(marketplace), type(uint256).max);
        vm.stopBroadcast();

        vm.startBroadcast(user);
        nft.setApprovalForAll(address(marketplace), true);
        USDC.approve(address(marketplace), type(uint256).max);
        vm.stopBroadcast();
    }

    function test_Mint() public {
        vm.startPrank(deployer);
        marketplace.mint();
        vm.stopPrank();

        assertEq(
            nft.balanceOf(deployer),
            1,
            "Deployer should have 1 NFT after minting"
        );
    }

    function testFuzz_ListItemApprovedForAll(uint256 price) public {
        vm.assume(price < USDC.balanceOf(user) && price != 0);
        vm.startPrank(deployer);
        marketplace.mint();
        marketplace.listItem(0, 5);
        vm.stopPrank();
        (, , bool onSale) = marketplace.items(0);
        assertTrue(onSale, "Item should be listed for sale");
    }

    function testFuzz_ListItemApproved(uint256 price) public {
        vm.assume(price < USDC.balanceOf(user) && price != 0);
        vm.startPrank(deployer);
        marketplace.mint();
        nft.setApprovalForAll(address(marketplace), false);
        nft.approve(address(marketplace), 0);
        marketplace.listItem(0, price);
        vm.stopPrank();

        (, , bool onSale) = marketplace.items(0);
        assertTrue(
            onSale,
            "Item should be listed for sale after specific approval"
        );
    }

    function test_RevertIf_PriceIsZero() public {
        vm.startPrank(deployer);
        marketplace.mint();
        vm.expectRevert("Price shouldn't be equal zero");
        marketplace.listItem(0, 0);
        vm.stopPrank();
    }

    function test_RevertIf_NFTIsntApproved() public {
        vm.startPrank(deployer);
        marketplace.mint();
        nft.setApprovalForAll(address(marketplace), false);
        vm.expectRevert("You haven't approved NFT for this contract");
        marketplace.listItem(0, 1);
        vm.stopPrank();
    }

    function test_RevertWhen_NonOwnerTryingToList() public {
        vm.startPrank(deployer);
        marketplace.mint();
        vm.stopPrank();

        vm.startPrank(user);
        vm.expectRevert("You aren't owner of the token");
        marketplace.listItem(0, 1);
        vm.stopPrank();
    }

    function testFuzz_PurchaseItem(uint256 price) public {
        vm.assume(price < ((USDC.balanceOf(user) * 9) / 10) && price != 0);

        vm.startPrank(deployer);
        marketplace.mint();
        marketplace.listItem(0, price);
        vm.stopPrank();

        // vm.expectEmit(true, false, false, false);
        // emit Bought(0, price, user);
        vm.prank(user);
        marketplace.purchaseItem(0);

        assertEq(
            nft.ownerOf(0),
            user,
            "The NFT owner should be the user after purchase."
        );
    }

    function test_RevertIf_NFTIsntListed() public {
        vm.prank(user);
        vm.expectRevert("Item isn't on sale");
        marketplace.purchaseItem(1);
    }

    function testFuzz_RevertWhen_SellerTryingToBuy(uint256 price) public {
        vm.assume(price < USDC.balanceOf(user) && price != 0);

        vm.startPrank(deployer);
        marketplace.mint();
        marketplace.listItem(0, price);

        vm.expectRevert("You can't buy NFT from yourself");
        marketplace.purchaseItem(0);
        vm.stopPrank();
    }

    function test_RevertIf_PriceHigherThanBalance() public {
        vm.startPrank(deployer);
        marketplace.mint();
        marketplace.listItem(0, USDC.balanceOf(user) + 1);
        vm.stopPrank();

        vm.prank(user);
        vm.expectRevert("Insufficient funds for buying NFT");
        marketplace.purchaseItem(0);
    }

    function testFuzz_RemoveListing(uint256 price) public {
        vm.assume(price < USDC.balanceOf(user) && price != 0);

        vm.startPrank(deployer);
        marketplace.mint();
        marketplace.listItem(0, price);
        marketplace.removeListing(0);
        vm.stopPrank();

        (, , bool onSale) = marketplace.items(0);
        assertFalse(onSale, "Item should no longer be on sale");
    }

    function testFuzz_RevertWhen_NonOwnerTryingToDelist(uint256 price) public {
        vm.assume(price < USDC.balanceOf(user) && price != 0);

        vm.startPrank(deployer);
        marketplace.mint();
        marketplace.listItem(0, price);
        vm.stopPrank();

        vm.prank(user);
        vm.expectRevert("You aren't the seller");
        marketplace.removeListing(0);
    }

    ///??????????????????????????????????????????????????????????????????????????
    function testFuzz_RevertIf_NFTIsntListed(uint256 price) public {
        vm.assume(price < ((USDC.balanceOf(user) * 9) / 10) && price != 0);

        vm.prank(deployer);
        marketplace.mint();
        marketplace.listItem(0, price);
        marketplace.removeListing(0);

        vm.expectRevert("This item isn't listed");
        marketplace.removeListing(0);
        vm.stopPrank();
    }

    function test_Bid() public {
        vm.prank(deployer);
        marketplace.mint();

        SigUtils.Bid memory bid = SigUtils.Bid({
            buyer: user,
            tokenId: 0,
            price: 100,
            deadline: block.timestamp + 1 days,
            nonce: 0
        });

        SigUtils sigUtils = new SigUtils(marketplace.DOMAIN_SEPARATOR());

        bytes32 digest = sigUtils.getTypedDataHash(bid);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            0x6e91e48ead6608d5243d1018bceb544a792cf96a4e7729ba5e88a511fe7ffdfd,
            digest
        );

        vm.expectEmit(true, true, true, true); // Активация всех четырёх флагов означает проверку всех аспектов события
        emit BidAccepted(0, user, deployer, 100); // Используйте актуальные значения вместо примерных
        vm.prank(deployer);
        marketplace.acceptBid(
            bid.buyer,
            bid.tokenId,
            bid.price,
            bid.deadline,
            v,
            r,
            s
        );

        assertEq(nft.ownerOf(0), address(user));
    }
}

contract SigUtils {
    bytes32 internal DOMAIN_SEPARATOR;

    constructor(bytes32 _DOMAIN_SEPARATOR) {
        DOMAIN_SEPARATOR = _DOMAIN_SEPARATOR;
    }

    bytes32 internal constant BID_TYPE_HASH =
        keccak256(
            "Bid(address buyer,uint256 tokenId,uint256 price,uint256 deadline,uint256 nonce)"
        );

    struct Bid {
        address buyer;
        uint256 tokenId;
        uint256 price;
        uint256 deadline;
        uint256 nonce;
    }

    function getStructHash(Bid memory _bid) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    BID_TYPE_HASH,
                    _bid.buyer,
                    _bid.tokenId,
                    _bid.price,
                    _bid.deadline,
                    _bid.nonce
                )
            );
    }

    function getTypedDataHash(Bid memory _bid) public view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    DOMAIN_SEPARATOR,
                    getStructHash(_bid)
                )
            );
    }
}
