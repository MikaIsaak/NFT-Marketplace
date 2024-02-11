import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { assert, expect } from "chai";
import {ethers} from "hardhat";
require('dotenv').config();
import { BigNumber } from "ethers";
import { Marketplace } from "../typechain-types";
import { USDC, USDT } from "../typechain-types";
import { MyNFTContract } from "../typechain-types";
import { token } from "../typechain-types/@openzeppelin/contracts";

describe("Marketplace", function() {
    async function deploy() {
      // const sepoliaRpcUrl = `https://eth-sepolia.g.alchemy.com/v2/Ud3CHhz93HvVW7tD1PIrR0Q6WHgsSFhT`;
      // const provider = new ethers.providers.AlchemyProvider(sepoliaRpcUrl);
      // const privateKey = ethers.utils.hexlify("46f32959177c97dc0d0c36d6a1e166af8861e43c15a51a3812159f84e26f3ffd");
      // const owner = new ethers.Wallet(privateKey, provider);

      const owner = ethers.getSigner("0xC05da40E0017A98444FCf8708E747227113c6619");
      console.log("Owner address is ", owner);

      // const USDCAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
      // const USDCAbi = [{"inputs":[{"internalType":"address","name":"implementationContract","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},{"stateMutability":"payable","type":"fallback"},{"inputs":[],"name":"admin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newAdmin","type":"address"}],"name":"changeAdmin","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"implementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"}],"name":"upgradeTo","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"upgradeToAndCall","outputs":[],"stateMutability":"payable","type":"function"}];
      // const USDC = new ethers.Contract(USDCAddress,USDCAbi, owner);

      // const nftFactory = await ethers.getContractFactory("MyNFTContract");
      // const nft = await nftFactory.deploy();
      // await nft.deployed();

      // const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
      // const marketplace = await MarketplaceFactory.deploy(10,nft.address, USDC.address);
      // await marketplace.deployed();
    }
});