import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-solhint";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-prettier";
import "hardhat-deploy";
import "@typechain/hardhat";

import { HardhatUserConfig } from "hardhat/config";
require('dotenv').config();



const config: HardhatUserConfig = {
  solidity: "0.8.20",
};

const { API_URL, PRIVATE_KEY } = process.env;

module.exports = {
  solidity: "0.8.20",
  defaultNetwork: "hardhat",
  etherscan: {
    apiKey: "QNX9ZW3KIIK624BHXI8PYXZC4AINCN8TEW"
  },
  networks: {
    hardhat: {
     forking: {
      // url: API_URL,
      // account: [`0x${PRIVATE_KEY}`]
    }
  },
    sepolia: {
      url: API_URL,
      accounts: [`0x${PRIVATE_KEY}`]
    }
  },
}

export default config;
