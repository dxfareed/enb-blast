import hre from "hardhat";
import { parseEther } from "viem"; // Helper to convert Ether to Wei

async function main() {
  console.log("Preparing to deploy the updated Game contract to Base...");

  // --- Contract Constructor Arguments ---
  const tokenAddress = "0xf73978b3a7d1d4974abae11f696c1b4408c027a0";
  const initialOwner = "0xe59df381684a7cf4d3e1177e68569b5d13f9585a";
  const signerAddress = "0x52c043C7120d7DA35fFdDF6C5c2359d503ceE5F8";
  const initialMaxClaims = 3n; // Using BigInt for uint256

  // --- NEW: Added arguments for the updated constructor ---
  // This value was previously the constant MAX_CLAIM_AMOUNT (300 ether)
  const initialMaxClaimAmount = parseEther("2000"); 
  // This value was previously the constant COOLDOWN_PERIOD (24 hours in seconds)
  const initialCooldownPeriod = 24n * 60n * 60n; // 86400 seconds
  
  // --- UPDATED: The constructor arguments array now includes the new values ---
  const constructorArgs = [
    tokenAddress,
    initialOwner,
    signerAddress,
    initialMaxClaims,
    initialMaxClaimAmount,
    initialCooldownPeriod
  ];
  // --- End of Updates ---

  const [deployer] = await hre.viem.getWalletClients();
  console.log(`Deploying contract with account: ${deployer.account.address}`);

  // --- UPDATED: Log the new arguments for clarity ---
  console.log("Constructor arguments:", {
    tokenAddress,
    initialOwner,
    signerAddress,
    initialMaxClaims: initialMaxClaims.toString(),
    initialMaxClaimAmount: initialMaxClaimAmount.toString(),
    initialCooldownPeriod: initialCooldownPeriod.toString()
  });

  console.log("Deploying contract...");

  const contractArtifact = await hre.artifacts.readArtifact("contracts/gamev5.sol:Game");

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
    console.log("Contract verified successfully on Basescan!");
  } catch (error) {
    console.error("Verification failed.", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
})