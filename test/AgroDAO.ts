import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import {
  AgroDAO__factory,
  AgroStaking__factory,
  AgroToken__factory,
  MockV3Aggregator__factory,
} from "../typechain-types";

const { ethers } = hre;

describe("AgroDAO", function () {
  async function deployAgroDAOFixture() {
    const [admin, user] = await ethers.getSigners();

    const initialSupply = ethers.parseUnits("100000", 18);
    const token = await new AgroToken__factory(admin).deploy(admin.address, initialSupply);
    await token.waitForDeployment();

    const priceFeed = await new MockV3Aggregator__factory(admin).deploy(8, 2500n * 10n ** 8n);
    await priceFeed.waitForDeployment();

    const staking = await new AgroStaking__factory(admin).deploy(
      admin.address,
      await token.getAddress(),
      await priceFeed.getAddress(),
      300_000n,
      ethers.parseUnits("10", 18),
      24n * 60n * 60n,
      2_000n * 10n ** 8n,
      3_000n * 10n ** 8n
    );
    await staking.waitForDeployment();

    const proposalThreshold = ethers.parseUnits("100", 18);
    const quorumVotes = ethers.parseUnits("1000", 18);
    const votingDelay = 1;
    const votingPeriod = 40;

    const dao = await new AgroDAO__factory(admin).deploy(
      admin.address,
      await token.getAddress(),
      proposalThreshold,
      quorumVotes,
      votingDelay,
      votingPeriod
    );
    await dao.waitForDeployment();

    return {
      dao,
      token,
      staking,
      priceFeed,
      admin,
      user,
      proposalThreshold,
      quorumVotes,
      votingDelay,
      votingPeriod,
    };
  }

  describe("deployment", function () {
    it("deploys with the correct initial parameters", async function () {
      const { dao, token, proposalThreshold, quorumVotes, votingDelay, votingPeriod } =
        await loadFixture(deployAgroDAOFixture);

      expect(await dao.votesToken()).to.equal(await token.getAddress());
      expect(await dao.proposalThreshold()).to.equal(proposalThreshold);
      expect(await dao.quorumVotes()).to.equal(quorumVotes);
      expect(await dao.votingDelay()).to.equal(votingDelay);
      expect(await dao.votingPeriod()).to.equal(votingPeriod);
    });

    it("grants the initial roles to the admin", async function () {
      const { dao, admin } = await loadFixture(deployAgroDAOFixture);

      expect(await dao.hasRole(await dao.DEFAULT_ADMIN_ROLE(), admin.address)).to.equal(true);
      expect(await dao.hasRole(await dao.PAUSER_ROLE(), admin.address)).to.equal(true);
      expect(await dao.hasRole(await dao.TARGET_ROLE(), admin.address)).to.equal(true);
      expect(await dao.hasRole(await dao.PARAMETER_ROLE(), admin.address)).to.equal(true);
    });

    it("reverts when deployed with the zero address admin", async function () {
      const { token, proposalThreshold, quorumVotes, votingDelay, votingPeriod } =
        await loadFixture(deployAgroDAOFixture);

      const AgroDAO = await ethers.getContractFactory("AgroDAO");

      await expect(
        AgroDAO.deploy(
          ethers.ZeroAddress,
          await token.getAddress(),
          proposalThreshold,
          quorumVotes,
          votingDelay,
          votingPeriod
        )
      ).to.be.revertedWith("invalid admin");
    });

    it("reverts when deployed with the zero address votes token", async function () {
      const { admin, proposalThreshold, quorumVotes, votingDelay, votingPeriod } =
        await loadFixture(deployAgroDAOFixture);

      const AgroDAO = await ethers.getContractFactory("AgroDAO");

      await expect(
        AgroDAO.deploy(
          admin.address,
          ethers.ZeroAddress,
          proposalThreshold,
          quorumVotes,
          votingDelay,
          votingPeriod
        )
      ).to.be.revertedWith("invalid votes token");
    });

    it("reverts when deployed with zero quorum", async function () {
      const { admin, token, proposalThreshold, votingDelay, votingPeriod } = await loadFixture(deployAgroDAOFixture);

      const AgroDAO = await ethers.getContractFactory("AgroDAO");

      await expect(
        AgroDAO.deploy(
          admin.address,
          await token.getAddress(),
          proposalThreshold,
          0,
          votingDelay,
          votingPeriod
        )
      ).to.be.revertedWith("invalid quorum");
    });

    it("reverts when deployed with zero voting period", async function () {
      const { admin, token, proposalThreshold, quorumVotes, votingDelay } = await loadFixture(deployAgroDAOFixture);

      const AgroDAO = await ethers.getContractFactory("AgroDAO");

      await expect(
        AgroDAO.deploy(
          admin.address,
          await token.getAddress(),
          proposalThreshold,
          quorumVotes,
          votingDelay,
          0
        )
      ).to.be.revertedWith("invalid voting period");
    });
  });
});
