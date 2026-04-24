import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { AgroToken__factory } from "../typechain-types";

const { ethers } = hre;

describe("AgroToken", function () {
  async function deployAgroTokenFixture() {
    const [admin, user] = await ethers.getSigners();
    const initialSupply = ethers.parseUnits("100000", 18);

    const token = await new AgroToken__factory(admin).deploy(admin.address, initialSupply);

    await token.waitForDeployment();

    return { token, admin, user, initialSupply };
  }

  describe("deployment", function () {
    it("deploys with correct name, symbol, and decimals", async function () {
      const { token } = await loadFixture(deployAgroTokenFixture);

      expect(await token.name()).to.equal("AgroChain Token");
      expect(await token.symbol()).to.equal("AGRO");
      expect(await token.decimals()).to.equal(18);
    });

    it("mints the initial supply to the admin", async function () {
      const { token, admin, initialSupply } = await loadFixture(deployAgroTokenFixture);

      expect(await token.totalSupply()).to.equal(initialSupply);
      expect(await token.balanceOf(admin.address)).to.equal(initialSupply);
    });

    it("grants the initial roles to the admin", async function () {
      const { token, admin } = await loadFixture(deployAgroTokenFixture);

      expect(await token.hasRole(await token.DEFAULT_ADMIN_ROLE(), admin.address)).to.equal(true);
      expect(await token.hasRole(await token.MINTER_ROLE(), admin.address)).to.equal(true);
      expect(await token.hasRole(await token.PAUSER_ROLE(), admin.address)).to.equal(true);
    });

    it("reverts when deployed with the zero address admin", async function () {
      const initialSupply = ethers.parseUnits("100000", 18);
      const AgroToken = await ethers.getContractFactory("AgroToken");

      await expect(AgroToken.deploy(ethers.ZeroAddress, initialSupply)).to.be.revertedWith(
        "invalid admin"
      );
    });
  });

  describe("access control", function () {
    it("allows accounts with MINTER_ROLE to mint", async function () {
      const { token, admin, user } = await loadFixture(deployAgroTokenFixture);
      const mintAmount = ethers.parseUnits("1000", 18);

      await token.connect(admin).mint(user.address, mintAmount);

      expect(await token.balanceOf(user.address)).to.equal(mintAmount);
      expect(await token.totalSupply()).to.equal((await token.balanceOf(admin.address)) + mintAmount);
    });

    it("reverts mint for accounts without MINTER_ROLE", async function () {
      const { token, user } = await loadFixture(deployAgroTokenFixture);
      const mintAmount = ethers.parseUnits("1000", 18);

      await expect(token.connect(user).mint(user.address, mintAmount)).to.be.revertedWithCustomError(
        token,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("allows accounts with PAUSER_ROLE to pause", async function () {
      const { token, admin } = await loadFixture(deployAgroTokenFixture);

      await token.connect(admin).pause();

      expect(await token.paused()).to.equal(true);
    });

    it("reverts pause for accounts without PAUSER_ROLE", async function () {
      const { token, user } = await loadFixture(deployAgroTokenFixture);

      await expect(token.connect(user).pause()).to.be.revertedWithCustomError(
        token,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("allows accounts with PAUSER_ROLE to unpause", async function () {
      const { token, admin } = await loadFixture(deployAgroTokenFixture);

      await token.connect(admin).pause();
      await token.connect(admin).unpause();

      expect(await token.paused()).to.equal(false);
    });

    it("reverts unpause for accounts without PAUSER_ROLE", async function () {
      const { token, admin, user } = await loadFixture(deployAgroTokenFixture);

      await token.connect(admin).pause();

      await expect(token.connect(user).unpause()).to.be.revertedWithCustomError(
        token,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("pausing", function () {
    it("blocks transfer while paused", async function () {
      const { token, admin, user } = await loadFixture(deployAgroTokenFixture);
      const transferAmount = ethers.parseUnits("100", 18);

      await token.connect(admin).pause();

      await expect(token.connect(admin).transfer(user.address, transferAmount)).to.be.revertedWithCustomError(
        token,
        "EnforcedPause"
      );
    });

    it("blocks transferFrom while paused", async function () {
      const { token, admin, user } = await loadFixture(deployAgroTokenFixture);
      const transferAmount = ethers.parseUnits("100", 18);

      await token.connect(admin).approve(user.address, transferAmount);
      await token.connect(admin).pause();

      await expect(
        token.connect(user).transferFrom(admin.address, user.address, transferAmount)
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });

    it("blocks mint while paused", async function () {
      const { token, admin, user } = await loadFixture(deployAgroTokenFixture);
      const mintAmount = ethers.parseUnits("100", 18);

      await token.connect(admin).pause();

      await expect(token.connect(admin).mint(user.address, mintAmount)).to.be.revertedWithCustomError(
        token,
        "EnforcedPause"
      );
    });

    it("allows transfers again after unpause", async function () {
      const { token, admin, user } = await loadFixture(deployAgroTokenFixture);
      const transferAmount = ethers.parseUnits("100", 18);

      await token.connect(admin).pause();
      await token.connect(admin).unpause();
      await token.connect(admin).transfer(user.address, transferAmount);

      expect(await token.balanceOf(user.address)).to.equal(transferAmount);
    });
  });
});
