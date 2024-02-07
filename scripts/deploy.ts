import { ethers } from "hardhat";
import { MarkShagal } from "../typechain-types";

async function main() {
  const [ owner ] = await ethers.getSigners();

  const Factory = await ethers.getContractFactory("MarkShagal");
  const MarkShagal = await Factory.deploy(owner.address);
  await MarkShagal.deployed();

  console.log("We deployed contract " + MarkShagal.address + " and owner is " + owner.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
