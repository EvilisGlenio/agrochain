import { addresses, getContract, runMain, wallet } from "./common";

async function main() {
  const token = getContract("AgroToken", addresses.token);

  const tx = await token.delegate(wallet.address);
  const receipt = await tx.wait();

  console.log(`Delegated votes to: ${wallet.address}`);
  console.log(`Transaction hash: ${receipt?.hash ?? tx.hash}`);
}

void runMain(main);
