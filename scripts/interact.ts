import hre, { ethers } from "hardhat";
import { MarkShagal } from "../typechain-types";

async function main() {
  try {
    // Get the ContractFactory of your SimpleContract
    const SimpleContract = await hre.ethers.getContractFactory("MarkShagal");

    // Connect to the deployed contract
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Replace with your deployed contract address
    const contract = await SimpleContract.attach(contractAddress);

    // Set a new message in the contract
    const [owner] = await ethers.getSigners();
    const amountToMint = 1;
    const tx = await contract.safeMint(owner.address, "ipfs://bafybeic4nffxipaekoennii4iwinlgoqpunyrilamqv3bykjgiyluuj5r4/");

    console.log("Address " + owner.address + " have minted " + await contract.balanceOf(owner.address));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();