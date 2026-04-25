import { loadFixture, mine } from "@nomicfoundation/hardhat-toolbox/network-helpers";
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

  async function deployProposableAgroDAOFixture() {
    const fixture = await deployAgroDAOFixture();
    const { dao, token, staking, admin, user, proposalThreshold } = fixture;

    await dao.connect(admin).setAllowedTarget(await staking.getAddress(), true);
    await token.connect(admin).transfer(user.address, proposalThreshold);
    await token.connect(user).delegate(user.address);
    await mine();

    return fixture;
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

  describe("administration", function () {
    it("allows TARGET_ROLE to update allowed targets", async function () {
      const { dao, admin, staking } = await loadFixture(deployAgroDAOFixture);

      await expect(dao.connect(admin).setAllowedTarget(await staking.getAddress(), true))
        .to.emit(dao, "AllowedTargetUpdated")
        .withArgs(await staking.getAddress(), true);

      expect(await dao.allowedTargets(await staking.getAddress())).to.equal(true);
    });

    it("reverts setAllowedTarget for accounts without TARGET_ROLE", async function () {
      const { dao, user, staking } = await loadFixture(deployAgroDAOFixture);

      await expect(dao.connect(user).setAllowedTarget(await staking.getAddress(), true)).to.be.revertedWithCustomError(
        dao,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("reverts setAllowedTarget with the zero address", async function () {
      const { dao, admin } = await loadFixture(deployAgroDAOFixture);

      await expect(dao.connect(admin).setAllowedTarget(ethers.ZeroAddress, true)).to.be.revertedWith(
        "invalid target"
      );
    });

    it("allows PARAMETER_ROLE to update voting parameters", async function () {
      const { dao, admin, proposalThreshold, quorumVotes, votingDelay, votingPeriod } =
        await loadFixture(deployAgroDAOFixture);

      const newProposalThreshold = proposalThreshold / 2n;
      const newQuorumVotes = quorumVotes / 2n;
      const newVotingDelay = votingDelay + 1;
      const newVotingPeriod = votingPeriod + 10;

      await expect(
        dao.connect(admin).setVotingParams(
          newProposalThreshold,
          newQuorumVotes,
          newVotingDelay,
          newVotingPeriod
        )
      )
        .to.emit(dao, "VotingParamsUpdated")
        .withArgs(
          proposalThreshold,
          newProposalThreshold,
          quorumVotes,
          newQuorumVotes,
          votingDelay,
          newVotingDelay,
          votingPeriod,
          newVotingPeriod
        );

      expect(await dao.proposalThreshold()).to.equal(newProposalThreshold);
      expect(await dao.quorumVotes()).to.equal(newQuorumVotes);
      expect(await dao.votingDelay()).to.equal(newVotingDelay);
      expect(await dao.votingPeriod()).to.equal(newVotingPeriod);
    });

    it("reverts setVotingParams for accounts without PARAMETER_ROLE", async function () {
      const { dao, user } = await loadFixture(deployAgroDAOFixture);

      await expect(dao.connect(user).setVotingParams(1, 1, 1, 1)).to.be.revertedWithCustomError(
        dao,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("reverts setVotingParams with zero quorum", async function () {
      const { dao, admin } = await loadFixture(deployAgroDAOFixture);

      await expect(dao.connect(admin).setVotingParams(1, 0, 1, 1)).to.be.revertedWith("invalid quorum");
    });

    it("reverts setVotingParams with zero voting period", async function () {
      const { dao, admin } = await loadFixture(deployAgroDAOFixture);

      await expect(dao.connect(admin).setVotingParams(1, 1, 1, 0)).to.be.revertedWith("invalid voting period");
    });

    it("allows PAUSER_ROLE to pause", async function () {
      const { dao, admin } = await loadFixture(deployAgroDAOFixture);

      await dao.connect(admin).pause();

      expect(await dao.paused()).to.equal(true);
    });

    it("reverts pause for accounts without PAUSER_ROLE", async function () {
      const { dao, user } = await loadFixture(deployAgroDAOFixture);

      await expect(dao.connect(user).pause()).to.be.revertedWithCustomError(
        dao,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("allows PAUSER_ROLE to unpause", async function () {
      const { dao, admin } = await loadFixture(deployAgroDAOFixture);

      await dao.connect(admin).pause();
      await dao.connect(admin).unpause();

      expect(await dao.paused()).to.equal(false);
    });

    it("reverts unpause for accounts without PAUSER_ROLE", async function () {
      const { dao, admin, user } = await loadFixture(deployAgroDAOFixture);

      await dao.connect(admin).pause();

      await expect(dao.connect(user).unpause()).to.be.revertedWithCustomError(
        dao,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("proposals", function () {
    it("allows a holder with sufficient delegated votes to create a proposal", async function () {
      const { dao, staking, user, votingDelay, votingPeriod } = await loadFixture(deployProposableAgroDAOFixture);
      const data = staking.interface.encodeFunctionData("setApr", [150_000n]);
      const description = "Increase base APR to 15%";

      const tx = await dao.connect(user).propose(await staking.getAddress(), 0, data, description);
      const receipt = await tx.wait();
      const proposalId = 1n;
      const proposal = await dao.proposals(proposalId);
      const blockNumber = BigInt(receipt!.blockNumber);

      expect(await dao.proposalCount()).to.equal(proposalId);
      expect(proposal.proposer).to.equal(user.address);
      expect(proposal.target).to.equal(await staking.getAddress());
      expect(proposal.value).to.equal(0n);
      expect(proposal.data).to.equal(data);
      expect(proposal.snapshotBlock).to.equal(blockNumber + BigInt(votingDelay));
      expect(proposal.deadlineBlock).to.equal(blockNumber + BigInt(votingDelay + votingPeriod));

      await expect(tx)
        .to.emit(dao, "Proposed")
        .withArgs(
          proposalId,
          user.address,
          await staking.getAddress(),
          0n,
          ethers.keccak256(ethers.toUtf8Bytes(description)),
          proposal.snapshotBlock,
          proposal.deadlineBlock
        );
    });

    it("reverts when the target is not allowed", async function () {
      const { dao, staking, token, admin, user, proposalThreshold } = await loadFixture(deployAgroDAOFixture);
      const data = staking.interface.encodeFunctionData("setApr", [150_000n]);

      await token.connect(admin).transfer(user.address, proposalThreshold);
      await token.connect(user).delegate(user.address);
      await mine();

      await expect(dao.connect(user).propose(await staking.getAddress(), 0, data, "Update APR")).to.be.revertedWith(
        "target not allowed"
      );
    });

    it("reverts when proposal data is empty", async function () {
      const { dao, staking, user } = await loadFixture(deployProposableAgroDAOFixture);

      await expect(dao.connect(user).propose(await staking.getAddress(), 0, "0x", "Empty proposal")).to.be.revertedWith(
        "empty proposal data"
      );
    });

    it("reverts when the proposer does not have enough voting power", async function () {
      const { dao, staking, token, admin, user, proposalThreshold } = await loadFixture(deployAgroDAOFixture);
      const data = staking.interface.encodeFunctionData("setApr", [150_000n]);

      await dao.connect(admin).setAllowedTarget(await staking.getAddress(), true);
      await token.connect(admin).transfer(user.address, proposalThreshold - 1n);
      await token.connect(user).delegate(user.address);
      await mine();

      await expect(dao.connect(user).propose(await staking.getAddress(), 0, data, "Update APR")).to.be.revertedWith(
        "proposal threshold"
      );
    });

    it("reverts when the proposer has balance but no delegated votes", async function () {
      const { dao, staking, token, admin, user, proposalThreshold } = await loadFixture(deployAgroDAOFixture);
      const data = staking.interface.encodeFunctionData("setApr", [150_000n]);

      await dao.connect(admin).setAllowedTarget(await staking.getAddress(), true);
      await token.connect(admin).transfer(user.address, proposalThreshold);
      await mine();

      await expect(dao.connect(user).propose(await staking.getAddress(), 0, data, "Update APR")).to.be.revertedWith(
        "proposal threshold"
      );
    });

    it("stores the correct description hash", async function () {
      const { dao, staking, user } = await loadFixture(deployProposableAgroDAOFixture);
      const description = "Increase base APR to 15%";
      const data = staking.interface.encodeFunctionData("setApr", [150_000n]);

      await dao.connect(user).propose(await staking.getAddress(), 0, data, description);

      const proposal = await dao.proposals(1n);

      expect(proposal.descriptionHash).to.equal(ethers.keccak256(ethers.toUtf8Bytes(description)));
    });

    it("sets snapshotBlock and deadlineBlock relative to the proposal block", async function () {
      const { dao, staking, user, votingDelay, votingPeriod } = await loadFixture(deployProposableAgroDAOFixture);
      const data = staking.interface.encodeFunctionData("setApr", [150_000n]);

      const tx = await dao.connect(user).propose(await staking.getAddress(), 0, data, "Update APR");
      const receipt = await tx.wait();
      const proposal = await dao.proposals(1n);
      const proposalBlock = BigInt(receipt!.blockNumber);

      expect(proposal.snapshotBlock).to.equal(proposalBlock + BigInt(votingDelay));
      expect(proposal.deadlineBlock).to.equal(proposal.snapshotBlock + BigInt(votingPeriod));
    });
  });
});
