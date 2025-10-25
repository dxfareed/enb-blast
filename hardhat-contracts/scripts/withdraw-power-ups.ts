import hre from "hardhat";

async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  const toAddress = "0x8A6472bCDF34378C81140f8122032849061a7B12";

  const powerUpContractAddress = "0xf40376a732f280b6d4488921fbaed274b3b6238a";

  console.log("Withdrawing funds from PowerUpContract to:", toAddress);

  const powerUpContract = await hre.viem.getContractAt("BlastPowerUpNFT", powerUpContractAddress);

  const tx = await powerUpContract.write.withdrawFunds([toAddress]);

  console.log("Funds withdrawn successfully. Transaction hash:", tx);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });