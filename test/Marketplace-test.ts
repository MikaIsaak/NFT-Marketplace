import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { assert, expect, use } from "chai";
import { ethers, network, upgrades } from "hardhat";
import { Marketplace } from "../typechain-types";
import { MarcChagall } from "../typechain-types";
import { token } from "../typechain-types/@openzeppelin/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { marketplace } from "../typechain-types/contracts";
import { Marketplace__factory } from "../typechain-types";
import { Address } from "hardhat-deploy/dist/types";
require("dotenv").config();

// interface of our message
//"Bid(address buyer,uint256 tokenId,uint256 price,uint256 deadline)");
interface BidMessage {
  buyer: string;
  tokenId: number;
  price: number;
  deadline: number;
}

// element of signature that give us oppurtunity to recover our signer in smart-contract
// we don't change this interface
interface RSV {
  r: string;
  s: string;
  v: number;
}

// Domain is interface which gives us possibility to write
interface Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

// split signature to receive elements of RSV
function splitSignatureToRSV(signature: string): RSV {
  const r = "0x" + signature.substring(2).substring(0, 64);
  const s = "0x" + signature.substring(2).substring(64, 128);
  const v = parseInt(signature.substring(2).substring(128, 130), 16);

  return { r, s, v };
}

// Signing
async function signBid(
  token: string,
  buyer: string,
  tokenId: number,
  price: number,
  deadline: number,
  signer: SignerWithAddress
): Promise<BidMessage & RSV> {
  // creating message using BidMessage interface
  const message: BidMessage = {
    buyer,
    tokenId,
    price,
    deadline,
  };

  // adding our Domain information, which we gave in smart-contract!
  const domain: Domain = {
    name: "Marketplace",
    version: "1",
    chainId: 11155111,
    verifyingContract: token,
  };

  //  build our signature in correct way for signing
  const typedData = createTypedData(message, domain);

  // signing
  const rawSignature = await signer._signTypedData(
    typedData.domain,
    typedData.types,
    typedData.message
  );

  // spliting signature to r s v elements
  const sig = splitSignatureToRSV(rawSignature);

  // return rsv and BidMessage struct elements
  return { ...sig, ...message };
}

// function we call in signing function in order to show message in correct way
function createTypedData(message: BidMessage, domain: Domain) {
  return {
    types: {
      Bid: [
        { name: "buyer", type: "address" },
        { name: "tokenId", type: "uint256" },
        { name: "price", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "Bid",
    domain,
    message,
  };
}

async function deploy() {
  const deployer = await ethers.getSigner(
    "0xC05da40E0017A98444FCf8708E747227113c6619"
  );

  const user = await ethers.getSigner(
    "0xB7D4D5D9b1EC80eD4De0A5D66f8C7f903A9a5AAe"
  );

  const USDCAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  const USDCAbi = require("../abi.json");
  const USDC = new ethers.Contract(USDCAddress, USDCAbi, deployer);

  const nftFactory = await ethers.getContractFactory("MarcChagall");
  const NFT = await upgrades.deployProxy(nftFactory, [deployer.address], {
    initializer: "initialize",
  });
  await NFT.deployed();

  const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
  const marketplace = await upgrades.deployProxy(
    MarketplaceFactory,
    [10, NFT.address, USDC.address],
    { initializer: "initialize" }
  );
  await marketplace.deployed();

  const DeployerNftApproveTx = await NFT.connect(deployer).setApprovalForAll(
    marketplace.address,
    true
  );
  const UserNftApproveTx = await NFT.connect(user).setApprovalForAll(
    marketplace.address,
    true
  );

  const DeployerUsdcApprove = await USDC.connect(deployer).approve(
    marketplace.address,
    ethers.utils.parseUnits("100", 6)
  );
  const UserUsdcApprove = await USDC.connect(user).approve(
    marketplace.address,
    ethers.utils.parseUnits("100", 6)
  );

  return { deployer, user, USDC, NFT, marketplace };
}

describe("Constructor", async () => {
  it("Should successfully deploy smart-contract", async () => {
    const { deployer, USDC, NFT } = await loadFixture(deploy);

    const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
    const marketplace = await upgrades.deployProxy(
      MarketplaceFactory,
      [10, NFT.address, USDC.address],
      { initializer: "initialize" }
    );
    await marketplace.deployed();

    expect(await marketplace.feePercent()).to.be.equal(10);
    expect(await marketplace.USDC()).to.be.equal(
      "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
    );
  });

  it("Should revert if fee percent is above 99", async () => {
    const { deployer, USDC, NFT } = await loadFixture(deploy);

    const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
    await expect(
      upgrades.deployProxy(
        MarketplaceFactory,
        [100, NFT.address, USDC.address],
        { initializer: "initialize" }
      )
    ).to.be.revertedWith("It's unsual big comission, please, change it");
  });

  it("Should revert if trying to call functuion initialize", async () => {
    const { deployer, USDC, NFT } = await loadFixture(deploy);

    const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
    const marketplace = await upgrades.deployProxy(
      MarketplaceFactory,
      [10, NFT.address, USDC.address],
      { initializer: "initialize" }
    );
    await marketplace.deployed();

    await expect(
      marketplace.connect(deployer).initialize(10, NFT.address, USDC.address)
    ).to.be.revertedWithCustomError(marketplace, "InvalidInitialization");
  });
});

describe("Mint", function () {
  it("Should mint NFT", async () => {
    const { deployer, marketplace, NFT } = await loadFixture(deploy);

    const mintTx = await marketplace.connect(deployer).mint();

    expect(await NFT.balanceOf(deployer.address)).to.be.eq(1);
  });
});

describe("List item", function () {
  it("Should list item if approved for all", async () => {
    const { deployer, marketplace, NFT } = await loadFixture(deploy);

    const mintTx = await marketplace.connect(deployer).mint();

    const listTx = await marketplace.connect(deployer).listItem(0, 5);

    expect(listTx)
      .to.emit(marketplace, "Offered")
      .withArgs(1, 5, deployer.address);
  });

  it("Should list item if approved", async () => {
    const { deployer, marketplace, NFT } = await loadFixture(deploy);

    const mintTx = await marketplace.connect(deployer).mint();

    const cancelApproveForAll = await NFT.connect(deployer).setApprovalForAll(
      marketplace.address,
      false
    );

    const simpleApprove = await NFT.connect(deployer).approve(
      marketplace.address,
      0
    );

    const listTx = await marketplace.connect(deployer).listItem(0, 5);

    expect(listTx)
      .to.emit(marketplace, "Offered")
      .withArgs(1, 5, deployer.address);
  });

  it("Should revert if price equals zero", async () => {
    const { deployer, marketplace } = await loadFixture(deploy);

    const tx = await marketplace.mint();

    await expect(marketplace.listItem(0, 0)).to.be.revertedWith(
      "Price shouldn't be equal zero"
    );
  });

  it("Should revert if NFT isn't approved for contract", async () => {
    const { deployer, marketplace, NFT } = await loadFixture(deploy);

    const mintTx = await marketplace.connect(deployer).mint();

    const DeployerNftApproveTx = await NFT.connect(deployer).setApprovalForAll(
      marketplace.address,
      false
    );

    await expect(
      marketplace.connect(deployer).listItem(0, 1)
    ).to.be.revertedWith("You haven't approved NFT for this contract");
  });

  it("Should revert if NFT is tried to be listed not by NFT owner ", async () => {
    const { deployer, user, marketplace, NFT } = await loadFixture(deploy);

    const mintTx = await marketplace.connect(deployer).mint();

    await expect(marketplace.connect(user).listItem(0, 1)).to.be.revertedWith(
      "You aren't owner of the token"
    );
  });
});

describe("purchaseItem", async () => {
  it("Should purchase Item", async () => {
    const { deployer, user, marketplace, NFT, USDC } =
      await loadFixture(deploy);
    const price = ethers.utils.parseUnits("1", 6);
    const allowance = ethers.utils.parseUnits("10", 6);

    const mintTx = await marketplace.connect(deployer).mint();

    const listTx = await marketplace.connect(deployer).listItem(0, price);

    const buyTx = await marketplace.connect(user).purchaseItem(0);

    expect(buyTx)
      .to.emit(marketplace, "Bought")
      .withArgs(0, price, user.address);
    expect(buyTx).to.changeTokenBalances(USDC, [deployer, user], [5, -5]);
    expect(buyTx).to.changeTokenBalances(NFT, [deployer, user], [-1, 1]);
  });

  it("Should revert if Item isn't on sale", async () => {
    const { deployer, user, marketplace, NFT, USDC } =
      await loadFixture(deploy);

    expect(marketplace.purchaseItem(1)).to.be.revertedWith(
      "Item isn't on sale"
    );
  });

  it("Should revert if buyer is message sender", async () => {
    const { deployer, user, marketplace, NFT, USDC } =
      await loadFixture(deploy);

    const mintTx = await marketplace.connect(deployer).mint();

    const listTx = await marketplace.connect(deployer).listItem(0, 5);

    await expect(
      marketplace.connect(deployer).purchaseItem(0)
    ).to.be.revertedWith("You can't buy NFT from yourself");
  });

  it("Should revert if buyer USDC balance isn't enough for buying NFT", async () => {
    const { deployer, user, marketplace, NFT, USDC } =
      await loadFixture(deploy);
    const price = ethers.utils.parseUnits("100", 6);

    const mintTx = await marketplace.connect(deployer).mint();

    const approveTx = await NFT.connect(deployer).setApprovalForAll(
      marketplace.address,
      true
    );

    const listTx = await marketplace.connect(deployer).listItem(0, price);

    const UsdcApproveTx = await USDC.connect(user).approve(
      marketplace.address,
      price
    );

    await expect(marketplace.connect(user).purchaseItem(0)).to.be.revertedWith(
      "Insufficient funds for buying NFT"
    );
  });
});

describe("removeListing", function () {
  it("Should remove listing", async () => {
    const { deployer, marketplace, NFT, USDC } = await loadFixture(deploy);
    const price = ethers.utils.parseUnits("1", 6);

    const mintTx = await marketplace.connect(deployer).mint();

    const listTx = await marketplace.connect(deployer).listItem(0, price);

    const delistTX = await marketplace.connect(deployer).removeListing(0);

    const struct = await marketplace.items(0);

    expect(struct.onSale).to.eq(false);
  });

  it("Should revert if non-owner trying to delist item", async () => {
    const { deployer, user, marketplace, NFT, USDC } =
      await loadFixture(deploy);
    const price = ethers.utils.parseUnits("1", 6);

    const mintTx = await marketplace.connect(deployer).mint();

    const listTx = await marketplace.connect(deployer).listItem(0, price);

    await expect(marketplace.connect(user).removeListing(1)).to.be.revertedWith(
      "You aren't the seller"
    );
  });

  it("Should revert if item isn't listed", async () => {
    const { deployer, user, marketplace, NFT, USDC } =
      await loadFixture(deploy);
    const price = ethers.utils.parseUnits("1", 6);

    const mintTx = await marketplace.connect(deployer).mint();

    const listTx = await marketplace.connect(deployer).listItem(0, price);

    const delistTX = await marketplace.connect(deployer).removeListing(0);

    await expect(
      marketplace.connect(deployer).removeListing(0)
    ).to.be.revertedWith("This item isn't listed");
  });
});

describe("acceptBid", function () {
  it("Should accept bid and transfer money", async () => {
    const { deployer, user, marketplace, NFT, USDC } =
      await loadFixture(deploy);

    const mintTx = await marketplace.connect(deployer).mint();

    const listTx = await marketplace.connect(deployer).listItem(0, 100);

    const signBidMessage = await signBid(
      marketplace.address,
      user.address,
      0,
      100,
      Math.floor(Date.now() / 1000) + 1000,
      user
    );

    const tx = await marketplace
      .connect(deployer)
      .acceptBid(
        signBidMessage.buyer,
        signBidMessage.tokenId,
        signBidMessage.price,
        signBidMessage.deadline,
        signBidMessage.v,
        signBidMessage.r,
        signBidMessage.s
      );

    expect(tx).to.changeTokenBalance(USDC, [user, deployer], [-100, +100]);
    expect(tx).to.changeTokenBalance(NFT, [user, deployer], [+1, -1]);
    expect(tx)
      .to.emit(marketplace, "BidAccepted")
      .withArgs(0, user.address, deployer.address, 100);
    expect((await marketplace.items(0)).onSale).to.eq(false);
  });

  it("Should revert if blocktimestamp is higher than deadline", async () => {
    const { deployer, user, marketplace, NFT, USDC } =
      await loadFixture(deploy);

    const mintTx = await marketplace.connect(deployer).mint();

    const listTx = await marketplace.connect(deployer).listItem(0, 100);

    const signBidMessage = await signBid(
      marketplace.address,
      user.address,
      0,
      100,
      100,
      user
    );

    await expect(
      marketplace
        .connect(deployer)
        .acceptBid(
          signBidMessage.buyer,
          signBidMessage.tokenId,
          signBidMessage.price,
          signBidMessage.deadline,
          signBidMessage.v,
          signBidMessage.r,
          signBidMessage.s
        )
    ).to.be.revertedWith("Time for this bid expired");
  });

  it("Should revert if buyer don't have enough balance to pay for bid", async () => {
    const { deployer, user, marketplace, NFT, USDC } =
      await loadFixture(deploy);

    const mintTx = await marketplace.connect(deployer).mint();

    const listTx = await marketplace.connect(deployer).listItem(0, 100);

    const signBidMessage = await signBid(
      marketplace.address,
      user.address,
      0,
      Number(ethers.utils.parseUnits("100", "6")),
      Math.floor(Date.now() / 1000) + 1000,
      user
    );

    await expect(
      marketplace
        .connect(deployer)
        .acceptBid(
          signBidMessage.buyer,
          signBidMessage.tokenId,
          signBidMessage.price,
          signBidMessage.deadline,
          signBidMessage.v,
          signBidMessage.r,
          signBidMessage.s
        )
    ).to.be.revertedWith(
      "Bidder don't have enough balance to pay for this bid"
    );
  });

  it("Should revert if signature is invalid", async () => {
    const { deployer, user, marketplace, NFT, USDC } =
      await loadFixture(deploy);

    const mintTx = await marketplace.connect(deployer).mint();

    const signBidMessage = await signBid(
      marketplace.address,
      deployer.address,
      0,
      100,
      Math.floor(Date.now() / 1000) + 1000,
      user
    );

    await expect(
      marketplace
        .connect(deployer)
        .acceptBid(
          signBidMessage.buyer,
          signBidMessage.tokenId,
          signBidMessage.price,
          signBidMessage.deadline,
          signBidMessage.v,
          signBidMessage.r,
          signBidMessage.s
        )
    ).to.be.revertedWith("Invalid signature");
  });

  it("Should revert if non-owner of NFT is trying to accept bid", async () => {
    const { deployer, user, marketplace, NFT, USDC } =
      await loadFixture(deploy);

    const mintTx = await marketplace.connect(deployer).mint();

    const listTx = await marketplace.connect(deployer).listItem(0, 100);

    const signBidMessage = await signBid(
      marketplace.address,
      user.address,
      0,
      100,
      Math.floor(Date.now() / 1000) + 1000,
      user
    );

    await expect(
      marketplace
        .connect(user)
        .acceptBid(
          signBidMessage.buyer,
          signBidMessage.tokenId,
          signBidMessage.price,
          signBidMessage.deadline,
          signBidMessage.v,
          signBidMessage.r,
          signBidMessage.s
        )
    ).to.be.revertedWith("You aren't owner of the token");
  });
});
