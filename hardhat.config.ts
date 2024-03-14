import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-solhint";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-prettier";
import "hardhat-deploy";
import "@typechain/hardhat";
import "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-foundry";


import { HardhatUserConfig } from "hardhat/config";
require("dotenv").config();

const config: HardhatUserConfig = {
  solidity: "0.8.20",
};

const { API_URL, PRIVATE_KEY, USER_PRIVATE_KEY } = process.env;

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
      },
    },
  },
  defaultNetwork: "hardhat",
  etherscan: {
    apiKey: "QNX9ZW3KIIK624BHXI8PYXZC4AINCN8TEW",
  },
  mocha: {
    timeout: 100000000,
  },
  networks: {
    hardhat: {
      gas: 1800000,
      forking: {
        url: API_URL,
      },
      accounts: [
        {
          privateKey: PRIVATE_KEY,
          balance: "1000000000000000000000",
        },
        {
          privateKey: USER_PRIVATE_KEY,
          balance: "1000000000000000000000",
        },
      ],
      chainId: 11155111,
    },
    sepolia: {
      url: API_URL,
      accounts: [`0x${PRIVATE_KEY}`],
    },
  },
};

export default config;
