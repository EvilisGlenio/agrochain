import { ethers } from "ethers";
import { addresses, getContract, runMain, wallet } from "./common";

async function main() {
  const target = process.argv[2];

  if (!target) {
    throw new Error("Usage: npx ts-node scripts/grant-nft-minter.ts <wallet-address>");
  }

  if (!ethers.isAddress(target)) {
    throw new Error(`Invalid address: ${target}`);
  }

  const nft = getContract("AgroLotNFT", addresses.nft);
  const role = ethers.id("MINTER_ROLE");

  const adminAddress = await wallet.getAddress();
  const alreadyHasRole = await nft.hasRole(role, target);

  console.log(`Admin signer: ${adminAddress}`);
  console.log(`NFT contract: ${addresses.nft}`);
  console.log(`Target wallet: ${target}`);

  if (alreadyHasRole) {
    console.log("Target already has MINTER_ROLE.");
    return;
  }

  const tx = await nft.grantRole(role, target);
  console.log(`Grant tx submitted: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`Grant confirmed in block ${receipt?.blockNumber ?? "unknown"}`);

  const hasRoleNow = await nft.hasRole(role, target);
  console.log(`MINTER_ROLE granted: ${hasRoleNow}`);
}

void runMain(main);
