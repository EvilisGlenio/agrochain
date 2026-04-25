import { ethers } from "ethers";
import { addresses, getContract, loadAbi, runMain, wallet } from "./common";

async function main() {
  const dao = getContract("AgroDAO", addresses.dao);
  const newAprBps = BigInt(process.env.NEW_APR_BPS ?? "150000");
  const description = process.env.PROPOSAL_DESCRIPTION ?? `Set staking APR to ${newAprBps} bps`;

  const stakingInterface = new ethers.Interface(loadAbi("AgroStaking"));
  const data = stakingInterface.encodeFunctionData("setApr", [newAprBps]);

  const tx = await dao.propose(addresses.staking, 0, data, description);
  const receipt = await tx.wait();

  console.log(`Proposer: ${wallet.address}`);
  console.log(`Target: ${addresses.staking}`);
  console.log(`New APR: ${newAprBps}`);
  console.log(`Description: ${description}`);
  console.log(`Proposal tx: ${receipt?.hash ?? tx.hash}`);
}

void runMain(main);
