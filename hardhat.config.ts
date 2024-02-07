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
  networks: {
    hardhat: {},
    sepolia: {
      url: API_URL,
      accounts: [`0x${PRIVATE_KEY}`]
    }
  },
}

export default config;
