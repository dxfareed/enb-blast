import { task } from "hardhat/config";
import { Address, isAddress } from "viem";

// =================================================================================================
// --- CONFIGURATION ---
// =================================================================================================

const RECIPIENT_LISTS = {
  // TIER 1 RECIPIENTS (Ranks 1-3)
  tier1: [
    "0x22dfa84d0ecbb58c9460ffc2a1ad32a580402b2a",
    "0x9b73ac9c0034ba26f8781baa37c4b06d727c9e1a",
    "0x6b538138d4355129becf0b900889a7c3feca92aa",
  ].map(addr => addr as Address),
  
  // TIER 2 RECIPIENTS (Ranks 4-10)
  tier2: [
    "0x22ecd246e5a2843c318d02f5b83f85e5fa370b1a",
    "0x308c439f9f742227156164fa6572f7d690953852",
    "0x8beadfb7190a01b12b267c2e96655dddcd9ed623",
    "0x4e30bcb75310e375a62864aec69c28d2503cba0d",
    "0x1437c8c1142efdea60cfe4bae23e7b703d33e3d7",
    "0xf5713dacb79324db7ab438142cf64994fb20901b",
    "0x5de65272846059efe0120f93e384bd5bcb738dcd",
  ].map(addr => addr as Address),

  // TIER 3 RECIPIENTS (Ranks 11-15)
  tier3: [
    "0x7b67a29d1e9fd5105bd75968d4df22b6c543a444",
    "0xab463aee005a4fd09d6cdedaa5c79f7d0156ffec",
    "0x29ff1111df1d35884e0f9b57d1469a10d5f51b6a",
    "0xdf63bfc9d88d844af300e937d431565e5b06ddd4",
    "0x9f645b4bb3941f6a6fdbaa51b9c20798b85531e4",
  ].map(addr => addr as Address),
};

// =================================================================================================
// --- HARDHAT TASK ---
// =================================================================================================

task("distribute-rewards", "Distributes rewards using the deployed RewardDistributor contract")
  .addPositionalParam("contract", "The address of the RewardDistributor contract")
  .setAction(async (taskArgs, hre) => {
    const contractAddress = taskArgs.contract as Address;

    // --- Validation ---
    if (!isAddress(contractAddress)) {
      throw new Error("Error: You must provide a valid contract address.");
    }

    try {
      console.log(`\nDistributing rewards from contract: ${contractAddress}`);
      console.log(`  Tier 1 Recipients: ${RECIPIENT_LISTS.tier1.length}`);
      console.log(`  Tier 2 Recipients: ${RECIPIENT_LISTS.tier2.length}`);
      console.log(`  Tier 3 Recipients: ${RECIPIENT_LISTS.tier3.length}`);
      console.log('------------------');

      // --- Interaction ---
      const [walletClient] = await hre.viem.getWalletClients();
      const publicClient = await hre.viem.getPublicClient();
      // Dynamically read the ABI from the compiled contract artifact
      const rewardDistributorAbi = (await hre.artifacts.readArtifact("RewardDistributor")).abi;

      console.log("Sending distribution transaction...");

      const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: rewardDistributorAbi,
          functionName: 'distributeRewards',
          args: [
            RECIPIENT_LISTS.tier1,
            RECIPIENT_LISTS.tier2,
            RECIPIENT_LISTS.tier3
          ],
      });

      console.log(`✅ Transaction sent! Hash: ${hash}`);
      console.log("Waiting for confirmation...");

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (receipt.status === 'success') {
        console.log("✅ Rewards distributed successfully!");
        console.log(`   Confirmed in block: ${receipt.blockNumber}`);
      } else {
        console.error('❌ Transaction failed! Check the transaction on a block explorer.');
      }

    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });