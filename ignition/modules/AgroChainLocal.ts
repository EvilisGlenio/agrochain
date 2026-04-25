import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const INITIAL_SUPPLY = 100_000n * 10n ** 18n;
const STAKING_REWARDS = 20_000n * 10n ** 18n;

const BASE_APR_BPS = 300_000n;
const MIN_STAKE = 10n * 10n ** 18n;
const STALE_THRESHOLD = 24n * 60n * 60n;
const FLOOR_PRICE = 2_000n * 10n ** 8n;
const CEILING_PRICE = 3_000n * 10n ** 8n;

const PROPOSAL_THRESHOLD = 100n * 10n ** 18n;
const QUORUM_VOTES = 1_000n * 10n ** 18n;
const VOTING_DELAY = 1n;
const VOTING_PERIOD = 40n;

const MOCK_FEED_DECIMALS = 8;
const MOCK_FEED_ANSWER = 2_500n * 10n ** 8n;

export default buildModule("AgroChainLocal", (m) => {
  const admin = m.getAccount(0);

  const mockPriceFeed = m.contract("MockV3Aggregator", [MOCK_FEED_DECIMALS, MOCK_FEED_ANSWER]);

  const token = m.contract("AgroToken", [admin, INITIAL_SUPPLY]);

  const nft = m.contract("AgroLotNFT", [admin]);

  const staking = m.contract("AgroStaking", [
    admin,
    token,
    mockPriceFeed,
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

  const stakingParameterRole = m.staticCall(staking, "PARAMETER_ROLE", []);

  m.call(staking, "grantRole", [stakingParameterRole, dao]);
  m.call(dao, "setAllowedTarget", [staking, true]);
  m.call(token, "transfer", [staking, STAKING_REWARDS]);

  return {
    mockPriceFeed,
    token,
    nft,
    staking,
    dao,
  };
});
