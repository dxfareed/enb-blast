import hre from "hardhat";
import { getAddress } from "viem";

async function main() {
  console.log("Preparing to deploy the Game contract to Base Sepolia...");

  const tokenAddress = "0x0a0E0FccC2c799845214E8E5583E44479EC02a23";
  const initialOwner = "0x70ca4a44A227645BB4815AE4d68098eA68aB926F";
  const signerAddress = "0x52c043C7120d7DA35fFdDF6C5c2359d503ceE5F8";
  const constructorArgs = [tokenAddress, initialOwner, signerAddress];

  const [deployer] = await hre.viem.getWalletClients();
  console.log(`Deploying contract with account: ${deployer.account.address}`);

  console.log("Deploying contract...");

  const contractArtifact = await hre.artifacts.readArtifact("Game");

  const deployTxHash = await deployer.deployContract({
    abi: contractArtifact.abi,
    bytecode: contractArtifact.bytecode as `0x${string}`, // cast to the expected type
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
  console.log(`Game contract deployed to address: ${contractAddress}`);

  console.log("\nWaiting for 5 block confirmations before verification...");
  await publicClient.waitForTransactionReceipt({ 
    hash: deployTxHash, 
    confirmations: 5 
  });
  console.log("5 block confirmations received.");

  console.log("\nVerifying contract on Basescan...");
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArgs,
    });
    console.log("✅ Contract verified successfully on Basescan!");
  } catch (error) {
    console.error("Verification failed.", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});