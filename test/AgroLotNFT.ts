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
});
