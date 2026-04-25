import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
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
});
