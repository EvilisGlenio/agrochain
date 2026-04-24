import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("AgroToken", function () {
  async function deployAgroTokenFixture() {
    const [admin, user] = await ethers.getSigners();
    const initialSupply = ethers.parseUnits("100000", 18);

    const AgroToken = await ethers.getContractFactory("AgroToken");
    const token = await AgroToken.deploy(admin.address, initialSupply);

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
});
