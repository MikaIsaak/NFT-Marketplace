import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { assert, expect } from "chai";
import {ethers} from "hardhat";
import { BigNumber } from "ethers";
import { ERC721MC, ERC721MC__factory } from "../typechain-types";
import { Marketplace } from "../typechain-types";

describe("MarcChagallCollection", function() {
    async function deploy() {
      const [ owner,fee,usdc,usdt ] = await ethers.getSigners();

      const Factory = await ethers.getContractFactory("ERC721MC");
      const contract = await Factory.deploy(owner.address);
      await contract.deployed();

      const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
      const marketplace = await MarketplaceFactory.deploy(10,fee.address,usdc.address,usdt.address);
      await marketplace.deployed();
  
      return { owner, contract }
    }


    it("Should mint 1 token", async() => {
        const { owner, contract } = await loadFixture(deploy);

        const mintTx = await contract.safeMint(owner.address, "");
        await mintTx.wait();

        expect(await contract.balanceOf(owner.address)).to.eq(1);
    });

    it("Should return correct baseUri", async() => {
        const { owner, contract } = await loadFixture(deploy);

        const mintTx = await contract.safeMint(owner.address, "");
        await mintTx.wait();

        const targetURI = "ipfs://bafybeic4nffxipaekoennii4iwinlgoqpunyrilamqv3bykjgiyluuj5r4/0";
        const factUri =  await contract.tokenURI(0);
        console.log(factUri);

        expect(factUri).to.equal(targetURI);
    });

    it("Should support inteface", async() => {
        const { owner, contract } = await loadFixture(deploy);

        const interfaceId = "0x5b5e139f";
        
        expect(await contract.supportsInterface(interfaceId)).to.be.true;
    });
});
