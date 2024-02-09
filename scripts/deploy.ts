import { ethers } from "hardhat";
import { MyNFTContract, Marketplace } from "../typechain-types";
async function main() {
  const nftFactory = await ethers.getContractFactory("MyNFTContract");
  const nft = await nftFactory.deploy();
  nft.deployed();
  console.log("NFT contract address is ", nft.address);

  const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
  const marketplace = await MarketplaceFactory.deploy(10,nft.address, "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238");
  console.log("Marketplace address is ", marketplace.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
