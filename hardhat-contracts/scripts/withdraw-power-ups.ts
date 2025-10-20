import hre from "hardhat";

async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  const toAddress = "0x8A6472bCDF34378C81140f8122032849061a7B12";

  const powerUpContractAddress = "0x333bc453a8fc5aab73badd6a93a12e5133f90c53";

  console.log("Withdrawing funds from PowerUpContract to:", toAddress);

  const powerUpContract = await hre.viem.getContractAt("PowerUpContract", powerUpContractAddress);

  const tx = await powerUpContract.write.withdrawFunds([toAddress]);

  console.log("Funds withdrawn successfully. Transaction hash:", tx);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });