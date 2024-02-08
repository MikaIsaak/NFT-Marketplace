import { ethers } from "hardhat";
import { MyNFTContract, Marketplace } from "../typechain-types";
async function main() {
  const [ owner ] = await ethers.getSigners();

  const nftFactory = await ethers.getContractFactory("MyNFTContract");
  const nft = await nftFactory.deploy();
  nft.deployed();

  const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
  const marketplace = await MarketplaceFactory.deploy();

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
