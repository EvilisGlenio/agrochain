import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const INITIAL_SUPPLY = 100_000n * 10n ** 18n;
const STAKING_REWARDS = 20_000n * 10n ** 18n;

const CHAINLINK_ETH_USD_SEPOLIA = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

const BASE_APR_BPS = 300_000n;
const MIN_STAKE = 10n * 10n ** 18n;
const STALE_THRESHOLD = 24n * 60n * 60n;
const FLOOR_PRICE = 2_000n * 10n ** 8n;
const CEILING_PRICE = 3_000n * 10n ** 8n;

const PROPOSAL_THRESHOLD = 100n * 10n ** 18n;
const QUORUM_VOTES = 1_000n * 10n ** 18n;
const VOTING_DELAY = 1n;
const VOTING_PERIOD = 40n;

export default buildModule("AgroChain", (m) => {
  const admin = m.getAccount(0);

  const token = m.contract("AgroToken", [admin, INITIAL_SUPPLY]);

  const nft = m.contract("AgroLotNFT", [admin]);

  const staking = m.contract("AgroStaking", [
    admin,
    token,
    CHAINLINK_ETH_USD_SEPOLIA,
    BASE_APR_BPS,
    MIN_STAKE,
    STALE_THRESHOLD,
    FLOOR_PRICE,
    CEILING_PRICE,
  ]);

  const dao = m.contract("AgroDAO", [
    admin,
    token,
    PROPOSAL_THRESHOLD,
    QUORUM_VOTES,
    VOTING_DELAY,
    VOTING_PERIOD,
  ]);

  return {
    admin,
    token,
    nft,
    staking,
    dao,
  };
});
