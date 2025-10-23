import hre from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { parseUnits } from "viem";

describe("Disperse", function () {
  async function deployDisperseFixture() {
    const [owner, addr1, addr2] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    const token = await hre.viem.deployContract("MockERC20", ["Mock Token", "MT", parseUnits("1000", 18)]);
    const disperse = await hre.viem.deployContract("Disperse");

    await token.write.transfer([disperse.address, parseUnits("100", 18)]);

    return { disperse, token, owner, addr1, addr2, publicClient };
  }

  it("Should allow the owner to disperse tokens", async function () {
    const { disperse, token, addr1, addr2 } = await loadFixture(deployDisperseFixture);
    const recipients = [addr1.account.address, addr2.account.address];
    const values = [parseUnits("10", 18), parseUnits("20", 18)];

    await disperse.write.disperseToken([token.address, recipients, values]);

    const balance1 = await token.read.balanceOf([addr1.account.address]);
    const balance2 = await token.read.balanceOf([addr2.account.address]);

    expect(balance1).to.equal(parseUnits("10", 18));
    expect(balance2).to.equal(parseUnits("20", 18));
  });

  it("Should not allow a non-owner to disperse tokens", async function () {
    const { disperse, token, addr1, addr2 } = await loadFixture(deployDisperseFixture);
    const recipients = [addr1.account.address, addr2.account.address];
    const values = [parseUnits("10", 18), parseUnits("20", 18)];

    const nonOwnerDisperse = await hre.viem.getContractAt("Disperse", disperse.address, { client: { wallet: addr1 } });

    await expect(
      nonOwnerDisperse.write.disperseToken([token.address, recipients, values])
    ).to.be.revertedWithCustomError(disperse, "OwnableUnauthorizedAccount")
      .withArgs(addr1.account.address);
  });

  it("Should revert if the contract has insufficient token balance", async function () {
    const { disperse, token, addr1, addr2 } = await loadFixture(deployDisperseFixture);
    const recipients = [addr1.account.address, addr2.account.address];
    const values = [parseUnits("50", 18), parseUnits("60", 18)];

    await expect(
      disperse.write.disperseToken([token.address, recipients, values])
    ).to.be.rejectedWith("Disperse: insufficient token balance");
  });

  it("Should revert if recipients and values length mismatch", async function () {
    const { disperse, token, addr1, addr2 } = await loadFixture(deployDisperseFixture);
    const recipients = [addr1.account.address, addr2.account.address];
    const values = [parseUnits("10", 18)];

    await expect(
      disperse.write.disperseToken([token.address, recipients, values])
    ).to.be.rejectedWith("Disperse: recipients and values length mismatch");
  });
});
