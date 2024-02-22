import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { assert, expect, use } from "chai";
import { ethers, network, upgrades } from "hardhat";
import { Marketplace } from "../typechain-types";
import { MarcChagall } from "../typechain-types";
import { token } from "../typechain-types/@openzeppelin/contracts";
require("dotenv").config();

async function deploy() {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: ["0xC05da40E0017A98444FCf8708E747227113c6619"],
  });

  const deployer = await ethers.getSigner(
    "0xC05da40E0017A98444FCf8708E747227113c6619"
  );

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: ["0xB7D4D5D9b1EC80eD4De0A5D66f8C7f903A9a5AAe"],
  });

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
  // console.log("Proxy address is ", marketplace.address);
  // console.log(
  //   "Admin proxy contract address is ",
  //   await upgrades.erc1967.getAdminAddress(marketplace.address)
  // );
  // console.log(
  //   "Implementation address is ",
  //   await upgrades.erc1967.getImplementationAddress(marketplace.address)
  // );

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

  describe("purchaseItem", async () => {
    it("Should purchase Item", async () => {
      const { deployer, user, marketplace, NFT, USDC } = await loadFixture(
        deploy
      );
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
      const { deployer, user, marketplace, NFT, USDC } = await loadFixture(
        deploy
      );

      expect(marketplace.purchaseItem(1)).to.be.revertedWith(
        "Item isn't on sale"
      );
    });

    it("Should revert if buyer is message sender", async () => {
      const { deployer, user, marketplace, NFT, USDC } = await loadFixture(
        deploy
      );

      const mintTx = await marketplace.connect(deployer).mint();

      const listTx = await marketplace.connect(deployer).listItem(0, 5);

      await expect(
        marketplace.connect(deployer).purchaseItem(0)
      ).to.be.revertedWith("You can't buy NFT from yourself");
    });

    it("Should revert if buyer USDC balance isn't enough for buying NFT", async () => {
      const { deployer, user, marketplace, NFT, USDC } = await loadFixture(
        deploy
      );
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

      await expect(
        marketplace.connect(user).purchaseItem(0)
      ).to.be.revertedWith("Insufficient funds for buying NFT");
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
      const { deployer, user, marketplace, NFT, USDC } = await loadFixture(
        deploy
      );
      const price = ethers.utils.parseUnits("1", 6);

      const mintTx = await marketplace.connect(deployer).mint();

      const listTx = await marketplace.connect(deployer).listItem(0, price);

      await expect(
        marketplace.connect(user).removeListing(1)
      ).to.be.revertedWith("You aren't the seller");
    });

    it("Should revert if item isn't listed", async () => {
      const { deployer, user, marketplace, NFT, USDC } = await loadFixture(
        deploy
      );
      const price = ethers.utils.parseUnits("1", 6);

      const mintTx = await marketplace.connect(deployer).mint();

      const listTx = await marketplace.connect(deployer).listItem(0, price);

      const delistTX = await marketplace.connect(deployer).removeListing(0);

      await expect(
        marketplace.connect(deployer).removeListing(0)
      ).to.be.revertedWith("This item isn't listed");
    });
  });

  describe("createBid", function () {
    it("Should create bid", async () => {
      const { deployer, user, marketplace, NFT, USDC } = await loadFixture(
        deploy
      );

      const mintTx = await marketplace.connect(deployer).mint();
      const createBidTx = await marketplace
        .connect(user)
        .createBid(0, ethers.utils.parseUnits("1", 6));
      const bidFromContract = await marketplace.connect(user).bids(0, 0);

      expect(bidFromContract.buyer).to.equal(user.address);
      expect(bidFromContract.price).to.equal(ethers.utils.parseUnits("1", 6));
      expect(createBidTx)
        .to.emit(marketplace, "BidCreated")
        .withArgs(0, user.address, ethers.utils.parseUnits("1", 6));
    });

    it("Should revert if NFT doesn't exist", async () => {
      const { deployer, user, marketplace, NFT, USDC } = await loadFixture(
        deploy
      );

      await expect(
        marketplace
          .connect(deployer)
          .createBid(0, ethers.utils.parseUnits("1", 6))
      )
        .to.be.revertedWithCustomError(NFT, "ERC721NonexistentToken")
        .withArgs(0);
    });

    it("Should revert if set price equals zero", async () => {
      const { deployer, user, marketplace, NFT, USDC } = await loadFixture(
        deploy
      );

      const mintTx = await marketplace.connect(deployer).mint();
      await expect(
        marketplace
          .connect(deployer)
          .createBid(0, ethers.utils.parseUnits("0", 6))
      ).to.be.revertedWith("Price shouldn't be equal zero");
    });

    it("Should revert if NFT owner trying to create bid on his NFT", async () => {
      const { deployer, user, marketplace, NFT, USDC } = await loadFixture(
        deploy
      );

      const mintTx = await marketplace.connect(deployer).mint();
      await expect(
        marketplace
          .connect(deployer)
          .createBid(0, ethers.utils.parseUnits("1", 6))
      ).to.be.revertedWith("Owner of  NFT can't make bid on his NFT");
    });

    it("Should revert if USDC balance of buyer isn't enough", async () => {
      const { deployer, user, marketplace, NFT, USDC } = await loadFixture(
        deploy
      );

      const mintTx = await marketplace.connect(deployer).mint();
      await expect(
        marketplace
          .connect(user)
          .createBid(0, ethers.utils.parseUnits("100000", 6))
      ).to.be.revertedWith("You don't have enough funds for bid");
    });
  });

  describe("acceptBid", function () {
    it("Should accept bid and transfer money", async () => {
      const { deployer, user, marketplace, NFT, USDC } = await loadFixture(
        deploy
      );

      const mintTx = await marketplace.connect(deployer).mint();

      const bidPrice = ethers.utils.parseUnits("1", 6);
      const bidTx = await marketplace.connect(user).createBid(0, bidPrice);

      const buyTx = await marketplace.connect(deployer).acceptBid(0, 0);

      expect(buyTx).to.changeTokenBalances(NFT, [deployer, user], [-1, 1]);

      expect(buyTx).to.changeTokenBalance(
        USDC,
        [deployer, user],
        [bidPrice, -bidPrice]
      );

      const bidArray = await marketplace.bids(0, 0);
      const onSale = await bidArray.onSale;
      expect((await marketplace.bids(0, 0)).onSale).to.be.reverted;
      expect(buyTx)
        .to.emit(marketplace, "BidAccepted")
        .withArgs(
          0,
          user.address,
          deployer.address,
          ethers.utils.parseUnits("1", 6)
        );
    });

    it("Should revert if non-owner trying to accept bid", async () => {
      const { deployer, user, marketplace, NFT, USDC } = await loadFixture(
        deploy
      );

      const mintTx = await marketplace.connect(deployer).mint();

      const bidPrice = ethers.utils.parseUnits("1", 6);
      const bidTx = await marketplace.connect(user).createBid(0, bidPrice);

      await expect(
        marketplace.connect(user).acceptBid(0, 0)
      ).to.be.revertedWith("You aren't owner of the token");
    });

    it("Should revert if bid doesn't exist", async () => {
      const { deployer, user, marketplace, NFT, USDC } = await loadFixture(
        deploy
      );

      const mintTx = await marketplace.connect(deployer).mint();
      await expect(
        marketplace.connect(deployer).acceptBid(0, 1)
      ).to.be.revertedWithPanic(0x32);
    });

    it("Should change listed item status onSale to false", async () => {
      const { deployer, user, marketplace, NFT, USDC } = await loadFixture(
        deploy
      );

      const mintTx = await marketplace.connect(deployer).mint();

      const listTx = await marketplace
        .connect(deployer)
        .listItem(0, ethers.utils.parseUnits("1", 6));

      const bidPrice = ethers.utils.parseUnits("1", 6);
      const bidTx = await marketplace.connect(user).createBid(0, bidPrice);

      const buyTx = await marketplace.connect(deployer).acceptBid(0, 0);

      expect((await marketplace.items(0)).onSale).to.eq(false);
    });
  });

  describe("cancelBid", function () {
    it("Should cancel bid", async () => {
      const { deployer, user, marketplace, NFT, USDC } = await loadFixture(
        deploy
      );

      const mintTx = await marketplace.connect(deployer).mint();
      const createBidTx = await marketplace
        .connect(user)
        .createBid(0, ethers.utils.parseUnits("1", 6));
      const cancelBid = await marketplace.connect(user).cancelBid(0, 0);

      expect((await marketplace.bids(0, 0)).onSale).to.be.reverted;
      expect(cancelBid)
        .to.emit(marketplace, "BidCanceled")
        .withArgs(0, user.address, ethers.utils.parseUnits("1", 6));
    });

    it("Should revert if non-owner of bid try to cancel it", async () => {
      const { deployer, user, marketplace, NFT, USDC } = await loadFixture(
        deploy
      );

      const mintTx = await marketplace.connect(deployer).mint();
      const createBidTx = await marketplace
        .connect(user)
        .createBid(0, ethers.utils.parseUnits("1", 6));

      await expect(
        marketplace.connect(deployer).cancelBid(0, 0)
      ).to.be.revertedWith("You can't cancel not your bid");
    });
  });

  describe("getBids", function () {
    it("Should return bid with specified tokenId", async () => {
      const { deployer, user, marketplace, NFT, USDC } = await loadFixture(
        deploy
      );

      const mintTx = await marketplace.connect(deployer).mint();
      const createBidTx = await marketplace
        .connect(user)
        .createBid(0, ethers.utils.parseUnits("1", 6));
      const bid = await marketplace.bids(0, 0);
      const allBidsAtIndex0 = await marketplace.getBids(0);

      // Compare the individual properties of `bid` and the return value of `marketplace.getBids(0)`
      expect(allBidsAtIndex0[0].buyer).to.equal(bid.buyer);
      expect(allBidsAtIndex0[0].price).to.equal(bid.price);
      expect(allBidsAtIndex0[0].onSale).to.equal(bid.onSale);
    });

    it("Should return emptiness if there are no actual bids", async () => {
      const { deployer, user, marketplace, NFT, USDC } = await loadFixture(
        deploy
      );
      expect(await marketplace.getBids(0)).to.deep.eq([]);
    });
  });
});
