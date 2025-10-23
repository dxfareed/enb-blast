import hre from "hardhat";

async function main() {
  console.log("Preparing to deploy the Disperse contract...");

  const [deployer] = await hre.viem.getWalletClients();
  console.log(`Deploying contract with account: ${deployer.account.address}`);

  console.log("Deploying contract...");
  const contractArtifact = await hre.artifacts.readArtifact("Disperse");
  const deploymentTxHash = await deployer.deployContract({
    abi: contractArtifact.abi,
    bytecode: contractArtifact.bytecode,
    args: [],
  });

  console.log(`Deployment transaction sent! Hash: ${deploymentTxHash}`);
  
  console.log("Waiting for deployment to complete...");
  const publicClient = await hre.viem.getPublicClient();
  const receipt = await publicClient.waitForTransactionReceipt({ hash: deploymentTxHash });

  if (!receipt.contractAddress) {
    throw new Error("Contract address not found in transaction receipt.");
  }
  const contractAddress = receipt.contractAddress;
  console.log(`Disperse contract deployed to address: ${contractAddress}`);

  console.log("\nWaiting for 5 block confirmations before verification...");
  await publicClient.waitForTransactionReceipt({ 
    hash: deploymentTxHash, 
    confirmations: 5 
  });
  console.log("5 block confirmations received.");

  console.log("\nVerifying contract on Basescan...");
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });
    console.log("Contract verified successfully on Basescan!");
  } catch (error) {
    console.error("Verification failed.", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
