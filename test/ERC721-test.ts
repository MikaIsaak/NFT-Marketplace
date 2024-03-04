import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { assert, expect } from "chai";
import { ethers, upgrades, network } from "hardhat";
import { MarcChagall, MarcChagall__factory } from "../typechain-types";

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

  const nftFactory = await ethers.getContractFactory("MarcChagall");
  const NFT = await upgrades.deployProxy(nftFactory, [deployer.address], {
    initializer: "initialize",
  });
  await NFT.waitForDeployment();

  return { deployer, user, NFT };
}

describe("Initialize", async () => {
  it("Should initizialise ERC721", async () => {
    const { deployer, NFT } = await loadFixture(deploy);

    expect(await NFT.name()).to.eq("Marc Chagall");
    expect(await NFT.owner()).to.eq(deployer.address);
    expect(await NFT.symbol()).to.eq("MC");
  });

  // it("Shouldn't initialize without address", async () => {
  //   const { deployer, user, NFT } = await loadFixture(deploy);

  //   await expect(
  //     NFT.connect(user).initialize(user.getAddress())
  //   ).to.be.revertedWithCustomError(NFT, "InvalidInitialization");
  // });
});

describe("_baseURI", function () {
  it("Should return correct baseURI of token", async () => {
    const { deployer, NFT } = await loadFixture(deploy);

    const mintTx = await NFT.safeMint(deployer.address);
    await mintTx.wait();

    const targetURI =
      "ipfs://bafybeic4nffxipaekoennii4iwinlgoqpunyrilamqv3bykjgiyluuj5r4/0";
    const factUri = await NFT.tokenURI(0);

    expect(factUri).to.equal(targetURI);
  });
});
