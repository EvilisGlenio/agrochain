import { addresses, getContract, runMain, wallet } from "./common";

async function main() {
  const dao = getContract("AgroDAO", addresses.dao);

  const proposalId = BigInt(process.env.PROPOSAL_ID ?? "1");

  const tx = await dao.execute(proposalId, { value: 0 });
  const receipt = await tx.wait();

  console.log(`Executor: ${wallet.address}`);
  console.log(`Proposal ID: ${proposalId}`);
  console.log(`Execute tx: ${receipt?.hash ?? tx.hash}`);
}

void runMain(main);
