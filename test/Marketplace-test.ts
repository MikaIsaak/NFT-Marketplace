import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { assert, expect } from "chai";
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
  console.log("Proxy address is ", marketplace.address);
  console.log(
    "Admin proxy contract address is ",
    await upgrades.erc1967.getAdminAddress(marketplace.address)
  );
  console.log(
    "Implementation address is ",
    await upgrades.erc1967.getImplementationAddress(marketplace.address)
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

    const mintTx = await marketplace.mint();

    const approveTx = await NFT.setApprovalForAll(marketplace.address, true);

    const listTx = await marketplace.listItem(0, 5);

    expect(listTx)
      .to.emit(marketplace, "Offered")
      .withArgs(1, 5, deployer.address);
  });

  it("Should list item if approved for all", async () => {
    const { deployer, marketplace, NFT } = await loadFixture(deploy);

    const mintTx = await marketplace.mint();

    const approveTx = await NFT.approve(marketplace.address, 0);

    const listTx = await marketplace.listItem(0, 5);

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

      const approveTx = await NFT.connect(deployer).setApprovalForAll(
        marketplace.address,
        true
      );

      const listTx = await marketplace.connect(deployer).listItem(0, price);

      const UsdcApproveTx = await USDC.connect(user).approve(
        marketplace.address,
        allowance
      );

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

      const approveTx = await NFT.connect(deployer).setApprovalForAll(
        marketplace.address,
        true
      );

      const listTx = await marketplace.connect(deployer).listItem(0, 5);

      const UsdcApproveTx = await USDC.connect(deployer).approve(
        marketplace.address,
        10000
      );

      await expect(
        marketplace.connect(deployer).purchaseItem(0)
      ).to.be.revertedWith("You can't buy NFT from yourself");
    });

    // it("Should revert if buyer USDC balance isn't enough for buying NFT", async () => {
    //   const { deployer, user, marketplace, NFT, USDC } = await loadFixture(
    //     deploy
    //   );
    //   const price = ethers.utils.parseUnits("100", 6);

    //   const mintTx = await marketplace.connect(deployer).mint();

    //   const approveTx = await NFT.connect(deployer).setApprovalForAll(
    //     marketplace.address,
    //     true
    //   );

    //   const listTx = await marketplace.connect(deployer).listItem(0, price);

    //   const UsdcApproveTx = await USDC.connect(user).approve(
    //     marketplace.address,
    //     price
    //   );

    //   await expect(
    //     marketplace.connect(user).purchaseItem(0)
    //   ).to.be.revertedWith("Insufficient funds for buying NFT");
    // });
  });

  describe("removeListing", function () {
    it("Should remove listing", async () => {
      const { deployer, marketplace, NFT, USDC } = await loadFixture(deploy);
      const price = ethers.utils.parseUnits("1", 6);

      const mintTx = await marketplace.connect(deployer).mint();

      const approveTx = await NFT.connect(deployer).setApprovalForAll(
        marketplace.address,
        true
      );

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

      const approveTx = await NFT.connect(deployer).setApprovalForAll(
        marketplace.address,
        true
      );

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

      const approveTx = await NFT.connect(deployer).setApprovalForAll(
        marketplace.address,
        true
      );

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
        .connect(deployer)
        .createBid(0, ethers.utils.parseUnits("1", 6));
      const bidFromContract = await marketplace.connect(deployer).bids(0, 0);

      expect(bidFromContract.buyer).to.equal(deployer.address);
      expect(bidFromContract.price).to.equal(ethers.utils.parseUnits("1", 6));
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
  });

  describe("acceptBid", function () {
    it("Should accept bid and transfer money", async () => {
      const { deployer, user, marketplace, NFT, USDC } = await loadFixture(
        deploy
      );
      const price = ethers.utils.parseUnits("1", 6);

      const mintTx = await marketplace.connect(deployer).mint();

      const approveTx = await NFT.connect(deployer).setApprovalForAll(
        marketplace.address,
        true
      );

      const allowance = ethers.utils.parseUnits("10", 6);
      const UsdcApproveTx = await USDC.connect(user).approve(
        marketplace.address,
        allowance
      );

      expect(
        await marketplace.connect(deployer).acceptBid(0, 0)
      ).to.changeTokenBalances(NFT, [deployer, user], [-1, 1]);
      // expect(
      //   await marketplace.connect(user).createBid(0, price)
      // ).to.changeTokenBalances(USDC, [deployer, user], [5, -5]);
    });
  });
});
