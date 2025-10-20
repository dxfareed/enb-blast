// scripts/deploy-reward-distributor.ts
import { ethers } from "hardhat";

async function main() {
  // --- CONFIGURATION ---
  const tokenAddress = "0x..."; // TODO: Replace with your ERC20 token address
  const initialOwner = "0x..."; // TODO: Replace with the desired owner address
  const initialTreasuryAddress = "0x..."; // TODO: Replace with the treasury wallet address

  // --- VALIDATION ---
  if (!ethers.isAddress(tokenAddress) || !ethers.isAddress(initialOwner) || !ethers.isAddress(initialTreasuryAddress)) {
    throw new Error("Invalid address provided in configuration.");
  }

  // 0xE59DF381684a7cf4D3E1177e68569b5D13F9585a
  // 
  
  console.log("Deploying RewardDistributor contract...");
  console.log(`Token Address: ${tokenAddress}`);
  console.log(`Initial Owner: ${initialOwner}`);
  console.log(`Initial Treasury Address: ${initialTreasuryAddress}`);
  
  // --- DEPLOYMENT ---
  const rewardDistributorFactory = await ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = await rewardDistributorFactory.deploy(
    tokenAddress,
    initialOwner,
    initialTreasuryAddress
  );

  await rewardDistributor.waitForDeployment();

  const contractAddress = await rewardDistributor.getAddress();
  console.log(`RewardDistributor deployed to: ${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
