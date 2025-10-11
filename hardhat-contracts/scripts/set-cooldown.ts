import { task } from "hardhat/config";
import { Address } from "viem";

const TWELVE_HOURS_IN_SECONDS = 12 * 60 * 60; // 43200 seconds

task("set-cooldown", "Sets the cooldown period for the claim cycle in the Game contract")
  .addOptionalPositionalParam(
    "hours", 
    `The new cooldown period in hours. Defaults to 12 hours (${TWELVE_HOURS_IN_SECONDS} seconds).`
  )
  .setAction(async (taskArgs, hre) => {
    // 1. Input Validation and Calculation
    const hours = taskArgs.hours ? parseInt(taskArgs.hours, 10) : 12;
    const newCooldownInSeconds = BigInt(hours * 60 * 60);

    if (isNaN(hours) || hours <= 0) {
      console.error('❌ Invalid hours value. Please provide a positive number.');
      process.exit(1);
    }
    
    // Replace with your actual deployed contract address
    const contractAddress = "0xe7f16d266dbda5451d0a3f67d9404ff2e8178d91" as Address;

    try {
      console.log(`\nPreparing to set the cooldown period to ${hours} hours (${newCooldownInSeconds} seconds) in the Game contract...`);

      // 2. Setup Clients
      // Assuming your contract artifact is named 'Game' and located in the standard path
      const Game = await hre.artifacts.readArtifact("contracts/gamev5.sol:Game");
      const [wallet] = await hre.viem.getWalletClients();
      const publicClient = await hre.viem.getPublicClient();

      console.log(`Using wallet (Owner): ${wallet.account.address}`);
      console.log(`Interacting with contract: ${contractAddress}`);

      // 3. Pre-flight Check (Read from contract before sending a transaction)
      console.log("\nChecking current cooldown period...");
      const currentCooldown = await publicClient.readContract({
        address: contractAddress,
        abi: Game.abi,
        functionName: 'cooldownPeriod',
        args: [],
      });

      console.log(`Current cooldown period is: ${currentCooldown} seconds (${Number(currentCooldown) / 3600} hours).`);
      if (newCooldownInSeconds === currentCooldown) {
        console.error('❌ Error: The new cooldown period is the same as the current one. No action taken.');
        process.exit(1);
      }

      console.log('Proceeding with the transaction to update the cooldown period...');

      // 4. Execute the Transaction
      const hash = await wallet.writeContract({
        address: contractAddress,
        abi: Game.abi,
        functionName: 'setCooldownPeriod',
        args: [newCooldownInSeconds],
        account: wallet.account,
        chain: wallet.chain,
      });

      console.log(`\nTransaction sent! Hash: ${hash}`);
      console.log('Waiting for confirmation...');

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 2 // Wait for 2 block confirmations
      });

      console.log(`\nTransaction confirmed in block ${receipt.blockNumber}`);

      // 5. Post-execution Verification
      console.log("\nVerifying the new cooldown period...");
      const updatedCooldown = await publicClient.readContract({
        address: contractAddress,
        abi: Game.abi,
        functionName: 'cooldownPeriod',
        args: [],
      });

      if (newCooldownInSeconds === updatedCooldown) {
        console.log(`✅ Verification successful! Cooldown period has been updated to ${updatedCooldown} seconds (${hours} hours).`);
      } else {
        console.warn(`⚠️ Verification failed. The cooldown period is still ${updatedCooldown} seconds.`);
      }

      // 6. Print Summary
      console.log(`\n--- Summary ---`);
      console.log(`Gas used: ${receipt.gasUsed.toString()} wei`);
      console.log(`View on Basescan: https://basescan.org/tx/${hash}`);

    } catch (error: any) {
      // 7. Robust Error Handling
      console.error('\n❌ An error occurred:', error.message);
      if (error.cause) {
        console.error('Details:', error.cause.message);
      }
      process.exit(1);
    }
  });
  