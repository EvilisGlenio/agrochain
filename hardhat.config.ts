import "dotenv/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ignition-ethers";
import { HardhatUserConfig } from "hardhat/config";
import { HttpNetworkUserConfig } from "hardhat/types";

const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL;
const sepoliaPrivateKey = process.env.SEPOLIA_PRIVATE_KEY;
const etherscanApiKey = process.env.ETHERSCAN_API_KEY;

const networks: HardhatUserConfig["networks"] = {};

if (sepoliaRpcUrl && sepoliaPrivateKey) {
  networks.sepolia = {
    url: sepoliaRpcUrl,
    accounts: [sepoliaPrivateKey],
  } satisfies HttpNetworkUserConfig;
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks,
  etherscan: {
    apiKey: etherscanApiKey || "",
  },
};

export default config;
