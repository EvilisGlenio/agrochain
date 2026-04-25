import { ethers } from "ethers";
import { addresses, getContract, runMain, wallet } from "./common";

async function main() {
  const token = getContract("AgroToken", addresses.token);
  const staking = getContract("AgroStaking", addresses.staking);

  const amountInput = process.env.STAKE_AMOUNT ?? "100";
  const amount = ethers.parseUnits(amountInput, 18);

  const approveTx = await token.approve(addresses.staking, amount);
  const approveReceipt = await approveTx.wait();

  const stakeTx = await staking.stake(amount);
  const stakeReceipt = await stakeTx.wait();

  console.log(`Staker: ${wallet.address}`);
  console.log(`Stake amount: ${amountInput} AGRO`);
  console.log(`Approve tx: ${approveReceipt?.hash ?? approveTx.hash}`);
  console.log(`Stake tx: ${stakeReceipt?.hash ?? stakeTx.hash}`);
}

void runMain(main);
