import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { AgroLotNFT__factory } from "../typechain-types";

const { ethers } = hre;

describe("AgroLotNFT", function () {
  async function deployAgroLotNFTFixture() {
    const [admin, user] = await ethers.getSigners();

    const nft = await new AgroLotNFT__factory(admin).deploy(admin.address);
    await nft.waitForDeployment();

    return { nft, admin, user };
  }

  describe("deployment", function () {
    it("deploys with correct name and symbol", async function () {
      const { nft } = await loadFixture(deployAgroLotNFTFixture);

      expect(await nft.name()).to.equal("AgroChain Lot");
      expect(await nft.symbol()).to.equal("ALOT");
    });

    it("starts nextTokenId at zero", async function () {
      const { nft } = await loadFixture(deployAgroLotNFTFixture);

      expect(await nft.nextTokenId()).to.equal(0n);
    });

    it("grants the initial roles to the admin", async function () {
      const { nft, admin } = await loadFixture(deployAgroLotNFTFixture);

      expect(await nft.hasRole(await nft.DEFAULT_ADMIN_ROLE(), admin.address)).to.equal(true);
      expect(await nft.hasRole(await nft.MINTER_ROLE(), admin.address)).to.equal(true);
      expect(await nft.hasRole(await nft.PAUSER_ROLE(), admin.address)).to.equal(true);
    });

    it("reverts when deployed with the zero address admin", async function () {
      const AgroLotNFT = await ethers.getContractFactory("AgroLotNFT");

      await expect(AgroLotNFT.deploy(ethers.ZeroAddress)).to.be.revertedWith("invalid admin");
    });
  });

  describe("access control", function () {
    it("allows accounts with MINTER_ROLE to mint lots", async function () {
      const { nft, admin } = await loadFixture(deployAgroLotNFTFixture);

      await nft.connect(admin).mintLot("https://example.com/lots/0.json", "queijo");

      expect(await nft.ownerOf(0n)).to.equal(admin.address);
    });

    it("reverts mintLot for accounts without MINTER_ROLE", async function () {
      const { nft, user } = await loadFixture(deployAgroLotNFTFixture);

      await expect(
        nft.connect(user).mintLot("https://example.com/lots/0.json", "queijo")
      ).to.be.revertedWithCustomError(nft, "AccessControlUnauthorizedAccount");
    });

    it("allows accounts with PAUSER_ROLE to pause", async function () {
      const { nft, admin } = await loadFixture(deployAgroLotNFTFixture);

      await nft.connect(admin).pause();

      expect(await nft.paused()).to.equal(true);
    });

    it("reverts pause for accounts without PAUSER_ROLE", async function () {
      const { nft, user } = await loadFixture(deployAgroLotNFTFixture);

      await expect(nft.connect(user).pause()).to.be.revertedWithCustomError(
        nft,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("allows accounts with PAUSER_ROLE to unpause", async function () {
      const { nft, admin } = await loadFixture(deployAgroLotNFTFixture);

      await nft.connect(admin).pause();
      await nft.connect(admin).unpause();

      expect(await nft.paused()).to.equal(false);
    });

    it("reverts unpause for accounts without PAUSER_ROLE", async function () {
      const { nft, admin, user } = await loadFixture(deployAgroLotNFTFixture);

      await nft.connect(admin).pause();

      await expect(nft.connect(user).unpause()).to.be.revertedWithCustomError(
        nft,
        "AccessControlUnauthorizedAccount"
      );
    });
  });
});
