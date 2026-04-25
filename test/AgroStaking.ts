import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { AgroStaking__factory, MockERC20__factory, MockV3Aggregator__factory } from "../typechain-types";

const { ethers } = hre;

describe("AgroStaking", function () {
  async function deployAgroStakingFixture() {
    const [admin, user] = await ethers.getSigners();

    const token = await new MockERC20__factory(admin).deploy("Mock Agro", "mAGRO");
    await token.waitForDeployment();

    const priceFeed = await new MockV3Aggregator__factory(admin).deploy(8, 2500n * 10n ** 8n);
    await priceFeed.waitForDeployment();

    const baseAprBps = 300_000n;
    const minStake = ethers.parseUnits("10", 18);
    const staleThreshold = 24n * 60n * 60n;
    const floorPrice = 2_000n * 10n ** 8n;
    const ceilingPrice = 3_000n * 10n ** 8n;

    const staking = await new AgroStaking__factory(admin).deploy(
      admin.address,
      await token.getAddress(),
      await priceFeed.getAddress(),
      baseAprBps,
      minStake,
      staleThreshold,
      floorPrice,
      ceilingPrice
    );
    await staking.waitForDeployment();

    return {
      staking,
      token,
      priceFeed,
      admin,
      user,
      baseAprBps,
      minStake,
      staleThreshold,
      floorPrice,
      ceilingPrice,
    };
  }

  describe("deployment", function () {
    it("deploys with the correct initial parameters", async function () {
      const { staking, token, priceFeed, baseAprBps, minStake, staleThreshold, floorPrice, ceilingPrice } =
        await loadFixture(deployAgroStakingFixture);

      expect(await staking.token()).to.equal(await token.getAddress());
      expect(await staking.priceFeed()).to.equal(await priceFeed.getAddress());
      expect(await staking.baseAprBps()).to.equal(baseAprBps);
      expect(await staking.minStake()).to.equal(minStake);
      expect(await staking.staleThreshold()).to.equal(staleThreshold);
      expect(await staking.floorPrice()).to.equal(floorPrice);
      expect(await staking.ceilingPrice()).to.equal(ceilingPrice);
    });

    it("grants the initial roles to the admin", async function () {
      const { staking, admin } = await loadFixture(deployAgroStakingFixture);

      expect(await staking.hasRole(await staking.DEFAULT_ADMIN_ROLE(), admin.address)).to.equal(true);
      expect(await staking.hasRole(await staking.PAUSER_ROLE(), admin.address)).to.equal(true);
      expect(await staking.hasRole(await staking.PARAMETER_ROLE(), admin.address)).to.equal(true);
    });

    it("reverts when deployed with the zero address admin", async function () {
      const { token, priceFeed, baseAprBps, minStake, staleThreshold, floorPrice, ceilingPrice } =
        await loadFixture(deployAgroStakingFixture);

      const AgroStaking = await ethers.getContractFactory("AgroStaking");

      await expect(
        AgroStaking.deploy(
          ethers.ZeroAddress,
          await token.getAddress(),
          await priceFeed.getAddress(),
          baseAprBps,
          minStake,
          staleThreshold,
          floorPrice,
          ceilingPrice
        )
      ).to.be.revertedWith("invalid admin");
    });

    it("reverts when deployed with the zero address token", async function () {
      const { priceFeed, baseAprBps, minStake, staleThreshold, floorPrice, ceilingPrice, admin } =
        await loadFixture(deployAgroStakingFixture);

      const AgroStaking = await ethers.getContractFactory("AgroStaking");

      await expect(
        AgroStaking.deploy(
          admin.address,
          ethers.ZeroAddress,
          await priceFeed.getAddress(),
          baseAprBps,
          minStake,
          staleThreshold,
          floorPrice,
          ceilingPrice
        )
      ).to.be.revertedWith("invalid token");
    });

    it("reverts when deployed with the zero address price feed", async function () {
      const { token, baseAprBps, minStake, staleThreshold, floorPrice, ceilingPrice, admin } =
        await loadFixture(deployAgroStakingFixture);

      const AgroStaking = await ethers.getContractFactory("AgroStaking");

      await expect(
        AgroStaking.deploy(
          admin.address,
          await token.getAddress(),
          ethers.ZeroAddress,
          baseAprBps,
          minStake,
          staleThreshold,
          floorPrice,
          ceilingPrice
        )
      ).to.be.revertedWith("invalid price feed");
    });

    it("reverts when deployed with a non-positive floor price", async function () {
      const { token, priceFeed, baseAprBps, minStake, staleThreshold, ceilingPrice, admin } =
        await loadFixture(deployAgroStakingFixture);

      const AgroStaking = await ethers.getContractFactory("AgroStaking");

      await expect(
        AgroStaking.deploy(
          admin.address,
          await token.getAddress(),
          await priceFeed.getAddress(),
          baseAprBps,
          minStake,
          staleThreshold,
          0,
          ceilingPrice
        )
      ).to.be.revertedWith("invalid floor price");
    });

    it("reverts when deployed with a ceiling below the floor", async function () {
      const { token, priceFeed, baseAprBps, minStake, staleThreshold, floorPrice, admin } =
        await loadFixture(deployAgroStakingFixture);

      const AgroStaking = await ethers.getContractFactory("AgroStaking");

      await expect(
        AgroStaking.deploy(
          admin.address,
          await token.getAddress(),
          await priceFeed.getAddress(),
          baseAprBps,
          minStake,
          staleThreshold,
          floorPrice,
          floorPrice - 1n
        )
      ).to.be.revertedWith("invalid ceiling price");
    });

    it("reverts when deployed with zero stale threshold", async function () {
      const { token, priceFeed, baseAprBps, minStake, floorPrice, ceilingPrice, admin } =
        await loadFixture(deployAgroStakingFixture);

      const AgroStaking = await ethers.getContractFactory("AgroStaking");

      await expect(
        AgroStaking.deploy(
          admin.address,
          await token.getAddress(),
          await priceFeed.getAddress(),
          baseAprBps,
          minStake,
          0,
          floorPrice,
          ceilingPrice
        )
      ).to.be.revertedWith("invalid stale threshold");
    });
  });

  describe("access control", function () {
    it("allows PARAMETER_ROLE to update APR", async function () {
      const { staking, admin, baseAprBps } = await loadFixture(deployAgroStakingFixture);
      const newAprBps = 150_000n;

      await expect(staking.connect(admin).setApr(newAprBps))
        .to.emit(staking, "AprUpdated")
        .withArgs(baseAprBps, newAprBps);

      expect(await staking.baseAprBps()).to.equal(newAprBps);
    });

    it("reverts setApr for accounts without PARAMETER_ROLE", async function () {
      const { staking, user } = await loadFixture(deployAgroStakingFixture);

      await expect(staking.connect(user).setApr(150_000n)).to.be.revertedWithCustomError(
        staking,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("reverts setApr with zero APR", async function () {
      const { staking, admin } = await loadFixture(deployAgroStakingFixture);

      await expect(staking.connect(admin).setApr(0)).to.be.revertedWith("invalid apr");
    });

    it("allows PARAMETER_ROLE to update oracle parameters", async function () {
      const { staking, admin, staleThreshold, floorPrice, ceilingPrice } =
        await loadFixture(deployAgroStakingFixture);

      const newStaleThreshold = staleThreshold / 2n;
      const newFloorPrice = floorPrice - 100n * 10n ** 8n;
      const newCeilingPrice = ceilingPrice + 100n * 10n ** 8n;

      await expect(staking.connect(admin).setOracleParams(newStaleThreshold, newFloorPrice, newCeilingPrice))
        .to.emit(staking, "OracleParamsUpdated")
        .withArgs(
          staleThreshold,
          newStaleThreshold,
          floorPrice,
          newFloorPrice,
          ceilingPrice,
          newCeilingPrice
        );

      expect(await staking.staleThreshold()).to.equal(newStaleThreshold);
      expect(await staking.floorPrice()).to.equal(newFloorPrice);
      expect(await staking.ceilingPrice()).to.equal(newCeilingPrice);
    });

    it("reverts setOracleParams for accounts without PARAMETER_ROLE", async function () {
      const { staking, user } = await loadFixture(deployAgroStakingFixture);

      await expect(
        staking.connect(user).setOracleParams(3600n, 2_000n * 10n ** 8n, 3_000n * 10n ** 8n)
      ).to.be.revertedWithCustomError(staking, "AccessControlUnauthorizedAccount");
    });

    it("reverts setOracleParams with zero stale threshold", async function () {
      const { staking, admin, floorPrice, ceilingPrice } = await loadFixture(deployAgroStakingFixture);

      await expect(staking.connect(admin).setOracleParams(0, floorPrice, ceilingPrice)).to.be.revertedWith(
        "invalid stale threshold"
      );
    });

    it("reverts setOracleParams with non-positive floor price", async function () {
      const { staking, admin, ceilingPrice } = await loadFixture(deployAgroStakingFixture);

      await expect(staking.connect(admin).setOracleParams(3600n, 0, ceilingPrice)).to.be.revertedWith(
        "invalid floor price"
      );
    });

    it("reverts setOracleParams with ceiling below floor", async function () {
      const { staking, admin, floorPrice } = await loadFixture(deployAgroStakingFixture);

      await expect(staking.connect(admin).setOracleParams(3600n, floorPrice, floorPrice - 1n)).to.be.revertedWith(
        "invalid ceiling price"
      );
    });

    it("allows PAUSER_ROLE to pause", async function () {
      const { staking, admin } = await loadFixture(deployAgroStakingFixture);

      await staking.connect(admin).pause();

      expect(await staking.paused()).to.equal(true);
    });

    it("reverts pause for accounts without PAUSER_ROLE", async function () {
      const { staking, user } = await loadFixture(deployAgroStakingFixture);

      await expect(staking.connect(user).pause()).to.be.revertedWithCustomError(
        staking,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("allows PAUSER_ROLE to unpause", async function () {
      const { staking, admin } = await loadFixture(deployAgroStakingFixture);

      await staking.connect(admin).pause();
      await staking.connect(admin).unpause();

      expect(await staking.paused()).to.equal(false);
    });

    it("reverts unpause for accounts without PAUSER_ROLE", async function () {
      const { staking, admin, user } = await loadFixture(deployAgroStakingFixture);

      await staking.connect(admin).pause();

      await expect(staking.connect(user).unpause()).to.be.revertedWithCustomError(
        staking,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("staking", function () {
    it("stakes successfully and updates the user position", async function () {
      const { staking, token, user, minStake } = await loadFixture(deployAgroStakingFixture);

      await token.mint(user.address, minStake);
      await token.connect(user).approve(await staking.getAddress(), minStake);

      await expect(staking.connect(user).stake(minStake)).to.emit(staking, "Staked").withArgs(user.address, minStake);

      const userStake = await staking.stakeInfo(user.address);

      expect(await token.balanceOf(await staking.getAddress())).to.equal(minStake);
      expect(userStake.amount).to.equal(minStake);
      expect(userStake.lastAccrual).to.be.greaterThan(0n);
    });

    it("reverts stake below the minimum", async function () {
      const { staking, token, user, minStake } = await loadFixture(deployAgroStakingFixture);
      const amount = minStake - 1n;

      await token.mint(user.address, minStake);
      await token.connect(user).approve(await staking.getAddress(), minStake);

      await expect(staking.connect(user).stake(amount)).to.be.revertedWith("min stake");
    });

    it("reverts stake without sufficient allowance", async function () {
      const { staking, token, user, minStake } = await loadFixture(deployAgroStakingFixture);

      await token.mint(user.address, minStake);

      await expect(staking.connect(user).stake(minStake)).to.be.reverted;
    });

    it("accumulates the staked amount across multiple stakes", async function () {
      const { staking, token, user, minStake } = await loadFixture(deployAgroStakingFixture);

      await token.mint(user.address, minStake * 2n);
      await token.connect(user).approve(await staking.getAddress(), minStake * 2n);

      await staking.connect(user).stake(minStake);
      await staking.connect(user).stake(minStake);

      const userStake = await staking.stakeInfo(user.address);

      expect(userStake.amount).to.equal(minStake * 2n);
      expect(await token.balanceOf(await staking.getAddress())).to.equal(minStake * 2n);
    });

    it("preserves accrued rewards before adding more stake", async function () {
      const { staking, token, user, minStake } = await loadFixture(deployAgroStakingFixture);

      await token.mint(user.address, minStake * 3n);
      await token.connect(user).approve(await staking.getAddress(), minStake * 3n);

      await staking.connect(user).stake(minStake);
      await time.increase(60 * 60);

      const earnedBefore = await staking.earned(user.address);

      await staking.connect(user).stake(minStake);

      const userStake = await staking.stakeInfo(user.address);

      expect(userStake.amount).to.equal(minStake * 2n);
      expect(earnedBefore).to.be.greaterThan(0n);
      expect(userStake.unclaimed).to.be.greaterThanOrEqual(earnedBefore);
      expect(userStake.lastAccrual).to.be.greaterThan(0n);
    });
  });

  describe("claiming and unstaking", function () {
    it("reverts claim when there are no rewards", async function () {
      const { staking, user } = await loadFixture(deployAgroStakingFixture);

      await expect(staking.connect(user).claim()).to.be.revertedWith("no rewards");
    });

    it("claims accrued rewards and resets unclaimed balance", async function () {
      const { staking, token, admin, user, minStake } = await loadFixture(deployAgroStakingFixture);
      const rewardFunding = ethers.parseUnits("10000", 18);

      await token.mint(user.address, minStake);
      await token.mint(admin.address, rewardFunding);
      await token.connect(user).approve(await staking.getAddress(), minStake);
      await token.connect(admin).transfer(await staking.getAddress(), rewardFunding);

      await staking.connect(user).stake(minStake);
      await time.increase(60 * 60);

      const earnedBeforeClaim = await staking.earned(user.address);
      const balanceBeforeClaim = await token.balanceOf(user.address);

      await expect(staking.connect(user).claim()).to.emit(staking, "Claimed");

      const userStake = await staking.stakeInfo(user.address);
      const balanceAfterClaim = await token.balanceOf(user.address);

      expect(earnedBeforeClaim).to.be.greaterThan(0n);
      expect(userStake.unclaimed).to.equal(0n);
      expect(balanceAfterClaim).to.be.greaterThan(balanceBeforeClaim);
    });

    it("unstakes tokens and reduces the user position", async function () {
      const { staking, token, user, minStake } = await loadFixture(deployAgroStakingFixture);

      await token.mint(user.address, minStake * 2n);
      await token.connect(user).approve(await staking.getAddress(), minStake * 2n);
      await staking.connect(user).stake(minStake * 2n);

      await expect(staking.connect(user).unstake(minStake))
        .to.emit(staking, "Unstaked")
        .withArgs(user.address, minStake);

      const userStake = await staking.stakeInfo(user.address);

      expect(userStake.amount).to.equal(minStake);
      expect(await token.balanceOf(user.address)).to.equal(minStake);
    });

    it("reverts unstake with zero amount", async function () {
      const { staking, user } = await loadFixture(deployAgroStakingFixture);

      await expect(staking.connect(user).unstake(0)).to.be.revertedWith("invalid amount");
    });

    it("reverts unstake when the amount exceeds the user stake", async function () {
      const { staking, token, user, minStake } = await loadFixture(deployAgroStakingFixture);

      await token.mint(user.address, minStake);
      await token.connect(user).approve(await staking.getAddress(), minStake);
      await staking.connect(user).stake(minStake);

      await expect(staking.connect(user).unstake(minStake + 1n)).to.be.revertedWith("insufficient stake");
    });

    it("preserves unclaimed rewards on partial unstake", async function () {
      const { staking, token, admin, user, minStake } = await loadFixture(deployAgroStakingFixture);
      const rewardFunding = ethers.parseUnits("10000", 18);

      await token.mint(user.address, minStake * 2n);
      await token.mint(admin.address, rewardFunding);
      await token.connect(user).approve(await staking.getAddress(), minStake * 2n);
      await token.connect(admin).transfer(await staking.getAddress(), rewardFunding);

      await staking.connect(user).stake(minStake * 2n);
      await time.increase(60 * 60);

      const earnedBeforeUnstake = await staking.earned(user.address);

      await staking.connect(user).unstake(minStake);

      const userStake = await staking.stakeInfo(user.address);

      expect(earnedBeforeUnstake).to.be.greaterThan(0n);
      expect(userStake.amount).to.equal(minStake);
      expect(userStake.unclaimed).to.be.greaterThanOrEqual(earnedBeforeUnstake);
    });

    it("supports full unstake", async function () {
      const { staking, token, user, minStake } = await loadFixture(deployAgroStakingFixture);

      await token.mint(user.address, minStake);
      await token.connect(user).approve(await staking.getAddress(), minStake);
      await staking.connect(user).stake(minStake);
      await staking.connect(user).unstake(minStake);

      const userStake = await staking.stakeInfo(user.address);

      expect(userStake.amount).to.equal(0n);
      expect(await token.balanceOf(user.address)).to.equal(minStake);
    });
  });

  describe("oracle and apr", function () {
    it("returns 90% of the base APR below the floor", async function () {
      const { staking, priceFeed, baseAprBps, floorPrice } = await loadFixture(deployAgroStakingFixture);

      await priceFeed.setRoundData(2, floorPrice - 1n, await time.latest(), await time.latest(), 2);

      expect(await staking.currentAprBps()).to.equal((baseAprBps * 90n) / 100n);
    });

    it("returns the base APR inside the neutral band", async function () {
      const { staking, priceFeed, baseAprBps } = await loadFixture(deployAgroStakingFixture);
      const now = await time.latest();

      await priceFeed.setRoundData(2, 2500n * 10n ** 8n, now, now, 2);

      expect(await staking.currentAprBps()).to.equal(baseAprBps);
    });

    it("returns 110% of the base APR above the ceiling", async function () {
      const { staking, priceFeed, baseAprBps, ceilingPrice } = await loadFixture(deployAgroStakingFixture);
      const now = await time.latest();

      await priceFeed.setRoundData(2, ceilingPrice + 1n, now, now, 2);

      expect(await staking.currentAprBps()).to.equal((baseAprBps * 110n) / 100n);
    });

    it("earned grows over time for an active position", async function () {
      const { staking, token, user, minStake } = await loadFixture(deployAgroStakingFixture);

      await token.mint(user.address, minStake);
      await token.connect(user).approve(await staking.getAddress(), minStake);
      await staking.connect(user).stake(minStake);

      const earnedAtStart = await staking.earned(user.address);
      await time.increase(60 * 60);
      const earnedAfterOneHour = await staking.earned(user.address);

      expect(earnedAtStart).to.equal(0n);
      expect(earnedAfterOneHour).to.be.greaterThan(0n);
    });

    it("earned returns only unclaimed when the user has no active stake", async function () {
      const { staking, token, admin, user, minStake } = await loadFixture(deployAgroStakingFixture);
      const rewardFunding = ethers.parseUnits("10000", 18);

      await token.mint(user.address, minStake);
      await token.mint(admin.address, rewardFunding);
      await token.connect(user).approve(await staking.getAddress(), minStake);
      await token.connect(admin).transfer(await staking.getAddress(), rewardFunding);

      await staking.connect(user).stake(minStake);
      await time.increase(60 * 60);
      await staking.connect(user).unstake(minStake);

      const userStake = await staking.stakeInfo(user.address);
      const earnedValue = await staking.earned(user.address);

      expect(userStake.amount).to.equal(0n);
      expect(userStake.unclaimed).to.be.greaterThan(0n);
      expect(earnedValue).to.equal(userStake.unclaimed);
    });

    it("reverts when the oracle answer is non-positive", async function () {
      const { staking, priceFeed } = await loadFixture(deployAgroStakingFixture);
      const now = await time.latest();

      await priceFeed.setRoundData(2, 0, now, now, 2);

      await expect(staking.currentAprBps()).to.be.revertedWith("bad oracle");
    });

    it("reverts when the oracle round is incomplete", async function () {
      const { staking, priceFeed } = await loadFixture(deployAgroStakingFixture);
      const now = await time.latest();

      await priceFeed.setRoundData(2, 2500n * 10n ** 8n, now, 0, 2);

      await expect(staking.currentAprBps()).to.be.revertedWith("incomplete oracle round");
    });

    it("reverts when the oracle timestamp is in the future", async function () {
      const { staking, priceFeed } = await loadFixture(deployAgroStakingFixture);
      const now = await time.latest();

      await priceFeed.setRoundData(2, 2500n * 10n ** 8n, now, now + 1000, 2);

      await expect(staking.currentAprBps()).to.be.revertedWith("future oracle timestamp");
    });

    it("reverts when answeredInRound is behind roundId", async function () {
      const { staking, priceFeed } = await loadFixture(deployAgroStakingFixture);
      const now = await time.latest();

      await priceFeed.setRoundData(2, 2500n * 10n ** 8n, now, now, 1);

      await expect(staking.currentAprBps()).to.be.revertedWith("stale oracle round");
    });

    it("reverts when the oracle data is stale by time", async function () {
      const { staking, priceFeed, staleThreshold } = await loadFixture(deployAgroStakingFixture);
      const now = await time.latest();

      await priceFeed.setRoundData(2, 2500n * 10n ** 8n, now, now, 2);
      await time.increase(Number(staleThreshold) + 1);

      await expect(staking.currentAprBps()).to.be.revertedWith("stale oracle");
    });

    it("computes rewards using the expected formula", async function () {
      const { staking, token, user, minStake, baseAprBps } = await loadFixture(deployAgroStakingFixture);
      const duration = 60 * 60;

      await token.mint(user.address, minStake);
      await token.connect(user).approve(await staking.getAddress(), minStake);
      await staking.connect(user).stake(minStake);

      await time.increase(duration);

      const expectedReward = (minStake * baseAprBps * BigInt(duration)) / (365n * 24n * 60n * 60n * 10_000n);
      const earnedValue = await staking.earned(user.address);

      expect(earnedValue).to.be.greaterThanOrEqual(expectedReward);
    });
  });

  describe("pausing", function () {
    it("blocks stake while paused", async function () {
      const { staking, token, admin, user, minStake } = await loadFixture(deployAgroStakingFixture);

      await token.mint(user.address, minStake);
      await token.connect(user).approve(await staking.getAddress(), minStake);
      await staking.connect(admin).pause();

      await expect(staking.connect(user).stake(minStake)).to.be.revertedWithCustomError(
        staking,
        "EnforcedPause"
      );
    });

    it("blocks claim while paused", async function () {
      const { staking, token, admin, user, minStake } = await loadFixture(deployAgroStakingFixture);
      const rewardFunding = ethers.parseUnits("10000", 18);

      await token.mint(user.address, minStake);
      await token.mint(admin.address, rewardFunding);
      await token.connect(user).approve(await staking.getAddress(), minStake);
      await token.connect(admin).transfer(await staking.getAddress(), rewardFunding);
      await staking.connect(user).stake(minStake);
      await time.increase(60 * 60);
      await staking.connect(admin).pause();

      await expect(staking.connect(user).claim()).to.be.revertedWithCustomError(staking, "EnforcedPause");
    });

    it("blocks unstake while paused", async function () {
      const { staking, token, admin, user, minStake } = await loadFixture(deployAgroStakingFixture);

      await token.mint(user.address, minStake);
      await token.connect(user).approve(await staking.getAddress(), minStake);
      await staking.connect(user).stake(minStake);
      await staking.connect(admin).pause();

      await expect(staking.connect(user).unstake(minStake)).to.be.revertedWithCustomError(
        staking,
        "EnforcedPause"
      );
    });

    it("allows stake, claim, and unstake again after unpause", async function () {
      const { staking, token, admin, user, minStake } = await loadFixture(deployAgroStakingFixture);
      const rewardFunding = ethers.parseUnits("10000", 18);

      await token.mint(user.address, minStake * 2n);
      await token.mint(admin.address, rewardFunding);
      await token.connect(user).approve(await staking.getAddress(), minStake * 2n);
      await token.connect(admin).transfer(await staking.getAddress(), rewardFunding);

      await staking.connect(admin).pause();
      await staking.connect(admin).unpause();

      await staking.connect(user).stake(minStake);
      await time.increase(60 * 60);
      await staking.connect(user).claim();
      await staking.connect(user).unstake(minStake);

      const userStake = await staking.stakeInfo(user.address);

      expect(userStake.amount).to.equal(0n);
    });
  });
});
