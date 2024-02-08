import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { assert, expect } from "chai";
import {ethers} from "hardhat";
import { BigNumber } from "ethers";
import { Marketplace } from "../typechain-types";
import { USDC, USDT } from "../typechain-types";
import { MyNFTContract } from "../typechain-types";
import { token } from "../typechain-types/@openzeppelin/contracts";

describe("Marketplace", function() {
    async function deploy() {
      const [ owner, user ] = await ethers.getSigners();

      const nftFactory = await ethers.getContractFactory("MyNFTContract");
      const nft = await nftFactory.deploy();
      await nft.deployed();

      const UsdcFactory = await ethers.getContractFactory("USDC");
      const USDC = await UsdcFactory.deploy(100000);
      await USDC.deployed();

      const UsdtFactory = await ethers.getContractFactory("USDT");
      const USDT = await UsdtFactory.deploy(1000000);
      await USDT.deployed();

      const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
      const marketplace = await MarketplaceFactory.deploy(10,nft.address,USDT.address, USDC.address);
      await marketplace.deployed();

      const usdtTransfer = await USDT.transfer(user.address,1000);
      await usdtTransfer.wait();

      const usdcTransfer = await USDC.transfer(user.address,1000);
      await usdcTransfer.wait();

      return { owner,user, nft, USDT, USDC, marketplace }
    }

    it("Should fallback when send ether", async() => {
        const {owner, marketplace} = await loadFixture(deploy);
        const initialBalance = await ethers.provider.getBalance(marketplace.address);

        const txData = {
            to: marketplace.address,
            value: ethers.utils.parseEther("1.0"), // Сумма в Ether, которую вы хотите отправить
          };

        const tx = await owner.sendTransaction(txData);
        await tx.wait();

        const afterReceiveBalance = await ethers.provider.getBalance(marketplace.address);

        expect(initialBalance).to.eq(afterReceiveBalance);
    });

    it("Should mint NFT for message sender", async() => {
        const {owner, marketplace, nft} = await loadFixture(deploy);

        const tx = await marketplace.connect(owner).mint();
        await tx.wait();

        expect(await nft.balanceOf(owner.address)).to.equal(1);
    });

    it("Should revert if price is lower than zero", async() => {
        const {owner, marketplace, USDT} = await loadFixture(deploy);  

        const tx = await marketplace.mint();
        await tx.wait();

        await expect(marketplace.listItem(1,0,USDT.address)).to.be.revertedWith("Price must be greater than zero");
    })

    it("Should revert if NFT isnt approved", async() => {
      const {owner, marketplace, USDT} = await loadFixture(deploy);  

      const tx = await marketplace.mint();
      await tx.wait();

      await expect(marketplace.listItem(1,10,USDT.address)).to.be.revertedWith("You havent approved NFT for this contract");
    });

    it("Should revert if NFT isnt approved for all", async() => {
      const {nft, marketplace, USDT} = await loadFixture(deploy);  

      const tx = await marketplace.mint();
      await tx.wait();

      const approveNFTForAll = await nft.setApprovalForAll(marketplace.address,true);

       expect(await marketplace.listItem(1,10,USDT.address)).to.be.ok;
    });

    it("Should revert if token isn't a USDC or USDT", async() => {
      const {owner, marketplace, USDT, nft} = await loadFixture(deploy);  

      const tx = await marketplace.mint();
      await tx.wait();

      const approveNFT = await nft.approve(marketplace.address,1);
      approveNFT.wait();

      await expect(marketplace.listItem(1,10,owner.address)).
      to.be.revertedWith("We dont accept this token for a payment");
    });

    it("Should revert if token isn't a USDC or USDT", async() => {
      const {owner, marketplace, USDC, nft} = await loadFixture(deploy);  

      const tx = await marketplace.mint();
      await tx.wait();

      const approveNFT = await nft.approve(marketplace.address,1);
      approveNFT.wait();

      await expect(marketplace.listItem(1,10,owner.address)).
      to.be.revertedWith("We dont accept this token for a payment");
    });

    it("Should revert if item doesnt exist", async() => {
      const {owner, marketplace, USDT} = await loadFixture(deploy);

      await expect(marketplace.purchaseItem(100,USDT.address)).to.be.revertedWith("item doesn't exist");
    });

    it("Should revert if item isnt on sale", async() => {
      const { marketplace, USDT, nft} = await loadFixture(deploy);

      const tx = await marketplace.mint();
      await tx.wait();

      const approveNFT = await nft.approve(marketplace.address,1);
      approveNFT.wait();

      const listItem = await marketplace.listItem(1,100,USDT.address);
      listItem.wait();

      const removeListing = await  marketplace.removeListing(1);
      await removeListing.wait();

      await expect(marketplace.purchaseItem(1,USDT.address)).
      to.be.revertedWith("Item isnt on sale");
    });

    it("Should revert if owner try to buy from himself", async() => {
      const { marketplace, USDT, nft} = await loadFixture(deploy);

      const tx = await marketplace.mint();
      await tx.wait();

      const approveNFT = await nft.approve(marketplace.address,1);
      approveNFT.wait();

      const listItem = await marketplace.listItem(1,100,USDT.address);
      listItem.wait();

      await expect(marketplace.purchaseItem(1,USDT.address)).
      to.be.revertedWith("You cant buy NFT from yourself");
    });

    it("Should revert if owner try to buy from himself", async() => {
      const { user, marketplace, USDT, nft} = await loadFixture(deploy);

      const tx = await marketplace.mint();
      await tx.wait();

      const approveNFT = await nft.approve(marketplace.address,1);
      approveNFT.wait();

      const listItem = await marketplace.listItem(1,100,USDT.address);
      listItem.wait();

      await expect(marketplace.connect(user).purchaseItem(1,user.address)).
      to.be.revertedWith("We dont accept this token for a payment");
    });

    it("Should revert if token balance is lower than neccessary", async() => {
      const { user, marketplace, USDT, nft} = await loadFixture(deploy);

      const tx = await marketplace.mint();
      await tx.wait();

      const approveNFT = await nft.approve(marketplace.address,1);
      approveNFT.wait();

      const listItem = await marketplace.listItem(1,100,USDT.address);
      listItem.wait();

      const sendMoney = await USDT.connect(user).transfer(marketplace.address, 999);

      // const buyItem = await marketplace.connect(user).purchaseItem(1,USDT.address);
      // await buyItem.wait();

      await expect(marketplace.connect(user).purchaseItem(1,USDT.address)).
      to.be.revertedWith("Insufficient funds for buying NFT");
    });

    it("Should work if everything ok", async() => {
      const { user, marketplace, USDT, nft} = await loadFixture(deploy);

      const tx = await marketplace.mint();
      await tx.wait();

      const approveNFT = await nft.approve(marketplace.address,1);
      approveNFT.wait();

      const approveERC20 = await USDT.connect(user).approve(marketplace.address, 1000);
      await approveERC20.wait();

      const listItem = await marketplace.listItem(1,100,USDT.address);
      listItem.wait();

      expect(await marketplace.connect(user).purchaseItem(1,USDT.address)).
      to.be.ok;
    });

    it("Should revert if non-owner trying to list item", async() => {
      const { user, marketplace, USDT, nft} = await loadFixture(deploy);

      const tx = await marketplace.mint();
      await tx.wait();

      const approveNFT = await nft.approve(marketplace.address,1);
      approveNFT.wait();

      await expect(marketplace.connect(user).listItem(1,100,USDT.address))
      .to.be.revertedWith("You aren't owner of the token");
    });

    it("Should revert if item doesnt exist during delist attempt", async() => {
      const { user, marketplace, USDT, nft} = await loadFixture(deploy);

      const tx = await marketplace.mint();
      await tx.wait();

      const approveNFT = await nft.approve(marketplace.address,1);
      approveNFT.wait();

      await expect(marketplace.connect(user).removeListing(1)).
      to.be.revertedWith("item doesn't exist");
    });

    it("Should revert if non-owner trying to delist item", async() => {
      const { user, marketplace, USDT, nft} = await loadFixture(deploy);

      const tx = await marketplace.mint();
      await tx.wait();

      const approveNFT = await nft.approve(marketplace.address,1);
      approveNFT.wait();

      const listItem = await marketplace.listItem(1,100,USDT.address);
      listItem.wait();

      await expect(marketplace.connect(user).removeListing(1)).
      to.be.revertedWith("You aren't the seller");
    });

    it("Should revert if trying to delist non-lested item", async() => {
      const { user, marketplace, USDT, nft} = await loadFixture(deploy);

      const tx = await marketplace.mint();
      await tx.wait();

      const approveNFT = await nft.approve(marketplace.address,1);
      approveNFT.wait();

      const listItem = await marketplace.listItem(1,100,USDT.address);
      listItem.wait();

      const firstDelisting = await marketplace.removeListing(1);
      await firstDelisting.wait();

      await expect(marketplace.removeListing(1))
      .to.be.revertedWith("This item isn't listed");
    });

    it("Should revert if percent of comission is higher than 99", async() => {
      const {nft, USDC, USDT} = await loadFixture(deploy);

      const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
      await expect(MarketplaceFactory.deploy(100,nft.address,USDT.address, USDC.address)).to.be.revertedWith("It's unsual big comission, please, change it");
    });














});
