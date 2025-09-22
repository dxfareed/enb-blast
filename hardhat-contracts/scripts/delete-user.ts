import { task } from "hardhat/config";
import { Address } from "viem";

task("delete-user", "Completely deletes a user's data from the Game contract")
  .addPositionalParam("address", "The wallet address of the user to delete")
  .setAction(async (taskArgs, hre) => {
    const addressToDelete = taskArgs.address as Address;

    if (!addressToDelete.match(/^0x[a-fA-F0-9]{40}$/)) {
      console.error('❌ Invalid Ethereum address format.');
      process.exit(1);
    }

    const contractAddress = "0xcbc4c882f044734e308996e2dba8552df0b2be10" as Address;

    try {
      console.log(`\nPreparing to permanently delete user ${addressToDelete} from the Game contract...`);

      const Game = await hre.artifacts.readArtifact("Game");
      const [wallet] = await hre.viem.getWalletClients();
      const publicClient = await hre.viem.getPublicClient();

      console.log(`Using wallet: ${wallet.account.address}`);
      console.log(`Interacting with contract: ${contractAddress}`);

      console.log("\nChecking if user is registered...");
      const isRegistered = await publicClient.readContract({
        address: contractAddress,
        abi: Game.abi,
        functionName: 'isUserRegistered',
        args: [addressToDelete],
      });

      if (!isRegistered) {
        console.error('❌ Error: User is not registered in the contract. No action taken.');
        process.exit(1);
      }

      console.log('User is registered. Proceeding with deletion transaction...');

      const hash = await wallet.writeContract({
        address: contractAddress,
        abi: Game.abi,
        functionName: 'deleteUser',
        args: [addressToDelete],
        account: wallet.account,
        chain: wallet.chain,   
      });

      console.log(`\nTransaction sent! Hash: ${hash}`);
      console.log('Waiting for confirmation...');

      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash,
        confirmations: 2 
      });

      console.log(`\nTransaction confirmed in block ${receipt.blockNumber}`);

      console.log("\nVerifying user deletion...");
      const isNowRegistered = await publicClient.readContract({
        address: contractAddress,
        abi: Game.abi,
        functionName: 'isUserRegistered',
        args: [addressToDelete],
      });

      if (!isNowRegistered) {
        console.log(`✅ Verification successful! User ${addressToDelete} has been permanently deleted.`);
      } else {
        console.warn(`⚠️ Verification failed. The user still appears to be registered.`);
      }

      console.log(`\n--- Summary ---`);
      console.log(`Gas used: ${receipt.gasUsed.toString()} wei`);
      console.log(`View on Basescan: https://basescan.org/tx/${hash}`);

    } catch (error: any) {
      console.error('\n❌ An error occurred:', error.message);
      process.exit(1);
    }
  });