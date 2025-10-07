import { task } from "hardhat/config";
import { Address } from "viem";

task("delete-user", "Completely deletes a user's data from the Game contract")
  .addPositionalParam("address", "The wallet address of the user to delete")
  .setAction(async (taskArgs, hre) => {
    const addressToDelete = taskArgs.address as Address;

    // 1. Input Validation
    if (!addressToDelete.match(/^0x[a-fA-F0-9]{40}$/)) {
      console.error('❌ Invalid Ethereum address format.');
      process.exit(1);
    }

    // 0x8A6472bCDF34378C81140f8122032849061a7B12

    // Replace with your actual deployed contract address
    const contractAddress = "0x03b922ee0573E52e09E6c8033c012500487A2384" as Address;

    try {
      console.log(`\nPreparing to permanently delete user ${addressToDelete} from the Game contract...`);

      // 2. Setup Clients
      const Game = await hre.artifacts.readArtifact("contracts/gamev2.sol:Game");
      const [wallet] = await hre.viem.getWalletClients();
      const publicClient = await hre.viem.getPublicClient();

      console.log(`Using wallet (Owner): ${wallet.account.address}`);
      console.log(`Interacting with contract: ${contractAddress}`);

      // 3. Pre-flight Check (Read from contract before sending a transaction)
      console.log("\nChecking if user is registered...");
      const isRegistered = await publicClient.readContract({
        address: contractAddress,
        abi: Game.abi,
        functionName: 'isRegistered', // Corrected function name
        args: [addressToDelete],
      });

      if (!isRegistered) {
        console.error('❌ Error: User is not registered in the contract. No action taken.');
        process.exit(1);
      }

      console.log('✅ User is registered. Proceeding with deletion transaction...');

      // 4. Execute the Deletion Transaction
      /* const hash = await wallet.writeContract({
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
        confirmations: 2 // Wait for 2 block confirmations for higher certainty
      });

      console.log(`\nTransaction confirmed in block ${receipt.blockNumber}`);

      // 5. Post-execution Verification
      console.log("\nVerifying user deletion...");
      const isNowRegistered = await publicClient.readContract({
        address: contractAddress,
        abi: Game.abi,
        functionName: 'isRegistered', // Corrected function name
        args: [addressToDelete],
      });

      if (!isNowRegistered) {
        console.log(`✅ Verification successful! User ${addressToDelete} has been permanently deleted.`);
      } else {
        console.warn(`⚠️ Verification failed. The user still appears to be registered.`);
      }

      // 6. Print Summary
      console.log(`\n--- Summary ---`);
      console.log(`Gas used: ${receipt.gasUsed.toString()} wei`);
      // Replace with your network's explorer URL if not using Base
      console.log(`View on Basescan: https://basescan.org/tx/${hash}`);
 */
    } catch (error: any) {
      // 7. Robust Error Handling
      console.error('\n❌ An error occurred:', error.message);
      process.exit(1);
    }
  });