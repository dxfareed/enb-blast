import { task } from "hardhat/config";
import { Address } from "viem";

task("increase-claim-limit", "Increases the max claims per cycle in the Game contract")
  .addPositionalParam("limit", "The new maximum number of claims per cycle")
  .setAction(async (taskArgs, hre) => {
    const newLimit = parseInt(taskArgs.limit, 10);

    // 1. Input Validation
    if (isNaN(newLimit) || newLimit <= 0) {
      console.error('❌ Invalid limit. Please provide a positive number.');
      process.exit(1);
    }

    // Replace with your actual deployed contract address
    const contractAddress = "0xe7f16d266dbda5451d0a3f67d9404ff2e8178d91" as Address;

    try {
      console.log(`\nPreparing to increase the claim limit to ${newLimit} in the Game contract...`);

      // 2. Setup Clients
      const Game = await hre.artifacts.readArtifact("contracts/gamev5.sol:Game");
      const [wallet] = await hre.viem.getWalletClients();
      const publicClient = await hre.viem.getPublicClient();

      console.log(`Using wallet (Owner): ${wallet.account.address}`);
      console.log(`Interacting with contract: ${contractAddress}`);

      // 3. Pre-flight Check (Read from contract before sending a transaction)
      console.log("\nChecking current max claims per cycle...");
      const currentLimit = await publicClient.readContract({
        address: contractAddress,
        abi: Game.abi,
        functionName: 'maxClaimsPerCycle',
        args: [],
      });

      console.log(`Current max claims per cycle is: ${currentLimit}`);
      if (BigInt(newLimit) === currentLimit) {
        console.error('❌ Error: The new limit is the same as the current limit. No action taken.');
        process.exit(1);
      }

      console.log('Proceeding with the transaction to update the limit...');

      // 4. Execute the Transaction
      const hash = await wallet.writeContract({
        address: contractAddress,
        abi: Game.abi,
        functionName: 'setMaxClaimsPerCycle',
        args: [BigInt(newLimit)],
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
      console.log("\nVerifying the new max claims per cycle...");
      const updatedLimit = await publicClient.readContract({
        address: contractAddress,
        abi: Game.abi,
        functionName: 'maxClaimsPerCycle',
        args: [],
      });

      if (BigInt(newLimit) === updatedLimit) {
        console.log(`✅ Verification successful! Max claims per cycle has been updated to ${updatedLimit}.`);
      } else {
        console.warn(`⚠️ Verification failed. The max claims per cycle is still ${updatedLimit}.`);
      }

      // 6. Print Summary
      console.log(`\n--- Summary ---`);
      console.log(`Gas used: ${receipt.gasUsed.toString()} wei`);
      // Replace with your network's explorer URL if not using Base
      console.log(`View on Basescan: https://basescan.org/tx/${hash}`);

    } catch (error: any) {
      // 7. Robust Error Handling
      console.error('\n❌ An error occurred:', error.message);
      process.exit(1);
    }
  });
