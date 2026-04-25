import { addresses, getContract, runMain, wallet } from "./common";

async function main() {
  const staking = getContract("AgroStaking", addresses.staking);

  const tx = await staking.claim();
  const receipt = await tx.wait();

  console.log(`Claimer: ${wallet.address}`);
  console.log(`Claim tx: ${receipt?.hash ?? tx.hash}`);
}

void runMain(main);
