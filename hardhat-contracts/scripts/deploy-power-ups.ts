import hre from "hardhat";
import { parseEther } from "viem";

async function main() {
  console.log("Preparing to deploy the PowerUpContract...");

  // --- Contract Constructor Arguments ---
  const initialDepositAmount = parseEther("0.000013");
  const initialOwner = "0xe59df381684a7cf4d3e1177e68569b5d13f9585a";
  const signerAddress = "0x52c043C7120d7DA35fFdDF6C5c2359d503ceE5F8";
  
  const constructorArgs = [
    initialDepositAmount,
    initialOwner,
    signerAddress
  ];

  const [deployer] = await hre.viem.getWalletClients();
  console.log(`Deploying contract with account: ${deployer.account.address}`);

  console.log("Constructor arguments:", {
    initialDepositAmount: initialDepositAmount.toString(),
    initialOwner,
    signerAddress
  });

  console.log("Deploying contract...");

  const contractArtifact = await hre.artifacts.readArtifact("contracts/power-ups.sol:PowerUpContract");

  const deployTxHash = await deployer.deployContract({
    abi: contractArtifact.abi,
    bytecode: contractArtifact.bytecode as `0x${string}`,
    args: constructorArgs,
  });

  console.log(`Deployment transaction sent! Hash: ${deployTxHash}`);

  console.log("Waiting for deployment to complete...");
  const publicClient = await hre.viem.getPublicClient();
  const receipt = await publicClient.waitForTransactionReceipt({ hash: deployTxHash });

  if (!receipt.contractAddress) {
    throw new Error("Contract address not found in transaction receipt.");
  }
  const contractAddress = receipt.contractAddress;
  console.log(`PowerUpContract contract deployed to address: ${contractAddress}`);

  console.log("\nWaiting for 5 block confirmations before verification...");
  await publicClient.waitForTransactionReceipt({
    hash: deployTxHash, 
    confirmations: 5 
  });
  console.log("5 block confirmations received.");

  console.log("\nVerifying contract on the blockchain explorer...");
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArgs,
    });
    console.log("Contract verified successfully!");
  } catch (error) {
    console.error("Verification failed.", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
