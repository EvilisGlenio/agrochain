import { BrowserProvider, Contract, ContractRunner } from "ethers";
import agroTokenAbi from "@/abi/AgroToken.json";
import agroLotNftAbi from "@/abi/AgroLotNFT.json";
import agroStakingAbi from "@/abi/AgroStaking.json";
import agroDaoAbi from "@/abi/AgroDAO.json";

export const contractAddresses = {
  token: process.env.NEXT_PUBLIC_AGRO_TOKEN ?? "",
  nft: process.env.NEXT_PUBLIC_AGRO_NFT ?? "",
  staking: process.env.NEXT_PUBLIC_AGRO_STAKING ?? "",
  dao: process.env.NEXT_PUBLIC_AGRO_DAO ?? "",
};

export const contractAbis = {
  token: agroTokenAbi,
  nft: agroLotNftAbi,
  staking: agroStakingAbi,
  dao: agroDaoAbi,
};

export function getTokenContract(runner: ContractRunner) {
  return new Contract(contractAddresses.token, contractAbis.token, runner);
}

export function getNftContract(runner: ContractRunner) {
  return new Contract(contractAddresses.nft, contractAbis.nft, runner);
}

export function getStakingContract(runner: ContractRunner) {
  return new Contract(contractAddresses.staking, contractAbis.staking, runner);
}

export function getDaoContract(runner: ContractRunner) {
  return new Contract(contractAddresses.dao, contractAbis.dao, runner);
}

export async function getReadContracts(provider: BrowserProvider) {
  return {
    token: getTokenContract(provider),
    nft: getNftContract(provider),
    staking: getStakingContract(provider),
    dao: getDaoContract(provider),
  };
}

export async function getWriteContracts(provider: BrowserProvider) {
  const signer = await provider.getSigner();

  return {
    signer,
    token: getTokenContract(signer),
    nft: getNftContract(signer),
    staking: getStakingContract(signer),
    dao: getDaoContract(signer),
  };
}

export function getMissingAddressKeys() {
  return Object.entries(contractAddresses)
    .filter(([, value]) => !value)
    .map(([key]) => key);
}
