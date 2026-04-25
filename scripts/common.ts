import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { ethers } from "ethers";

loadEnv();

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const rpcUrl = process.env.RPC_URL ?? process.env.SEPOLIA_RPC_URL;
const privateKey = process.env.PRIVATE_KEY ?? process.env.SEPOLIA_PRIVATE_KEY;

if (!rpcUrl) {
  throw new Error("Missing RPC_URL or SEPOLIA_RPC_URL");
}

if (!privateKey) {
  throw new Error("Missing PRIVATE_KEY or SEPOLIA_PRIVATE_KEY");
}

export const provider = new ethers.JsonRpcProvider(rpcUrl);
export const wallet = new ethers.Wallet(privateKey, provider);

export const addresses = {
  token: requiredEnv("AGRO_TOKEN"),
  nft: requiredEnv("AGRO_NFT"),
  staking: requiredEnv("AGRO_STAKING"),
  dao: requiredEnv("AGRO_DAO"),
};

export function loadAbi(contractName: string): ethers.InterfaceAbi {
  const artifactPath = path.join(
    process.cwd(),
    "artifacts",
    "contracts",
    `${contractName}.sol`,
    `${contractName}.json`
  );

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  return artifact.abi;
}

export function getContract(contractName: string, address: string) {
  return new ethers.Contract(address, loadAbi(contractName), wallet);
}

export function formatToken(amount: bigint, decimals = 18): string {
  return ethers.formatUnits(amount, decimals);
}

export async function runMain(main: () => Promise<void>) {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
