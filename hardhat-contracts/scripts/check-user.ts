import { task } from "hardhat/config";
import { Address } from "viem";

task("check-user", "Checks a user's status in the game contract")
  .addPositionalParam("address", "The address of the user to check")
  .setAction(async (taskArgs, hre) => {
    const userAddress = taskArgs.address as Address;
    const contractAddress = "0x1f13f96cad7c6709c6da865c8a4b49ca9599b443" as Address;

    try {
      console.log(`\nChecking status for user ${userAddress}...`);

      const Game = await hre.artifacts.readArtifact("Game");
      const publicClient = await hre.viem.getPublicClient();

      const profile = await publicClient.readContract({
        address: contractAddress,
        abi: Game.abi,
        functionName: 'getUserProfile',
        args: [userAddress],
      });

      const isCurrentlyRegistered = await publicClient.readContract({
        address: contractAddress,
        abi: Game.abi,
        functionName: 'isUserRegistered',
        args: [userAddress],
      });

      console.log('\nUser Status:');
      console.log('------------------');
      console.log(`Is Registered: ${profile.isRegistered}`);
      console.log(`Is Deleted: ${profile.isDeleted}`);
      console.log(`Currently Active: ${isCurrentlyRegistered}`);
      console.log(`Registration Date: ${new Date(Number(profile.registrationDate) * 1000).toLocaleString()}`);
      console.log(`Number of Claims: ${profile.claimCount}`);
      console.log(`Total Claimed: ${profile.totalClaimed}`);

    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }); 