import { addresses, getContract, runMain, wallet } from "./common";

async function main() {
  const dao = getContract("AgroDAO", addresses.dao);

  const proposalId = BigInt(process.env.PROPOSAL_ID ?? "1");
  const supportInput = (process.env.SUPPORT ?? "true").toLowerCase();
  const support = supportInput === "true";

  const tx = await dao.vote(proposalId, support);
  const receipt = await tx.wait();

  console.log(`Voter: ${wallet.address}`);
  console.log(`Proposal ID: ${proposalId}`);
  console.log(`Support: ${support}`);
  console.log(`Vote tx: ${receipt?.hash ?? tx.hash}`);
}

void runMain(main);
