import { ethers } from "ethers";
import { addresses, formatToken, getContract, provider, runMain, wallet } from "./common";

async function main() {
  const token = getContract("AgroToken", addresses.token);
  const staking = getContract("AgroStaking", addresses.staking);
  const dao = getContract("AgroDAO", addresses.dao);

  const walletAddress = wallet.address;

  const [
    network,
    ethBalance,
    agroBalance,
    votes,
    currentAprBps,
    proposalCount,
    stakeInfo,
  ] = await Promise.all([
    provider.getNetwork(),
    provider.getBalance(walletAddress),
    token.balanceOf(walletAddress),
    token.getVotes(walletAddress),
    staking.currentAprBps(),
    dao.proposalCount(),
    staking.stakeInfo(walletAddress),
  ]);

  let earned = 0n;
  try {
    earned = await staking.earned(walletAddress);
  } catch {
    // Oracle-dependent reads may revert if the feed is stale.
  }

  console.log(`Network: ${network.name} (${network.chainId})`);
  console.log(`Wallet: ${walletAddress}`);
  console.log(`ETH balance: ${ethers.formatEther(ethBalance)}`);
  console.log(`AGRO balance: ${formatToken(agroBalance)}`);
  console.log(`Delegated votes: ${formatToken(votes)}`);
  console.log(`Current APR (bps): ${currentAprBps}`);
  console.log(`Proposal count: ${proposalCount}`);
  console.log(`Staked amount: ${formatToken(stakeInfo.amount)}`);
  console.log(`Unclaimed rewards: ${formatToken(stakeInfo.unclaimed)}`);
  console.log(`Earned view: ${formatToken(earned)}`);
  console.log(`Last accrual: ${stakeInfo.lastAccrual}`);
}

void runMain(main);
