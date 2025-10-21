import { task } from "hardhat/config";
import { Address, isAddress, parseUnits, formatUnits } from "viem";
import * as readlineSync from 'readline-sync';

// =================================================================================================
// --- CONFIGURATION ---
// =================================================================================================

// Reward amounts in full tokens (the script will handle decimals)
const TIER_REWARDS = {
  tier1: "37000",
  tier2: "24000",
  tier3: "10000",
};

// Recipient Lists
const RECIPIENT_LISTS = {
  tier1: [
    "0x22dfa84d0ecbb58c9460ffc2a1ad32a580402b2a", "0x9b73ac9c0034ba26f8781baa37c4b06d727c9e1a",
    "0x6b538138d4355129becf0b900889a7c3feca92aa",
  ].map(addr => addr as Address),
  tier2: [
    "0x22ecd246e5a2843c318d02f5b83f85e5fa370b1a", "0x308c439f9f742227156164fa6572f7d690953852",
    "0x8beadfb7190a01b12b267c2e96655dddcd9ed623", "0x4e30bcb75310e375a62864aec69c28d2503cba0d",
    "0x1437c8c1142efdea60cfe4bae23e7b703d33e3d7", "0xf5713dacb79324db7ab438142cf64994fb20901b",
    "0x5de65272846059efe0120f93e384bd5bcb738dcd",
  ].map(addr => addr as Address),
  tier3: [
    "0x7b67a29d1e9fd5105bd75968d4df22b6c543a444", "0xab463aee005a4fd09d6cdedaa5c79f7d0156ffec",
    "0x29ff1111df1d35884e0f9b57d1469a10d5f51b6a", "0xdf63bfc9d88d844af300e937d431565e5b06ddd4",
    "0x9f645b4bb3941f6a6fdbaa51b9c20798b85531e4",
  ].map(addr => addr as Address),
};

// =================================================================================================
// --- HARDHAT TASK ---
// =================================================================================================

task("airdrop-rewards", "Sends ERC20 tokens directly from the deployer's wallet to a list of recipients.")
  .addPositionalParam("token", "The address of the ERC20 token to airdrop")
  .setAction(async (taskArgs, hre) => {
    const tokenAddress = taskArgs.token as Address;
    const TOKEN_DECIMALS = 18; // Based on your Solidity constant `10**18`

    // --- 1. Validation and Setup ---
    if (!isAddress(tokenAddress)) {
      throw new Error("Error: You must provide a valid token contract address.");
    }

    const [walletClient] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();
    const senderAddress = walletClient.account?.address;

    if (!senderAddress) {
      throw new Error("Error: No sender account found. Check your hardhat.config.ts.");
    }

    // --- 2. Prepare Transactions ---
    const tier1Amount = parseUnits(TIER_REWARDS.tier1, TOKEN_DECIMALS);
    const tier2Amount = parseUnits(TIER_REWARDS.tier2, TOKEN_DECIMALS);
    const tier3Amount = parseUnits(TIER_REWARDS.tier3, TOKEN_DECIMALS);

    const allTransfers = [
      ...RECIPIENT_LISTS.tier1.map(recipient => ({ recipient, amount: tier1Amount, tier: 'Tier 1' })),
      ...RECIPIENT_LISTS.tier2.map(recipient => ({ recipient, amount: tier2Amount, tier: 'Tier 2' })),
      ...RECIPIENT_LISTS.tier3.map(recipient => ({ recipient, amount: tier3Amount, tier: 'Tier 3' })),
    ];

    const totalAmountToSend = allTransfers.reduce((sum, t) => sum + t.amount, 0n);

    // --- 3. Confirmation Prompt ---
    console.log("\n--- Airdrop Summary ---");
    console.log(`Network:          ${hre.network.name}`);
    console.log(`Sender Address:   ${senderAddress}`);
    console.log(`Token Contract:   ${tokenAddress}`);
    console.log(`Total Recipients: ${allTransfers.length}`);
    console.log(`Total to Send:    ${formatUnits(totalAmountToSend, TOKEN_DECIMALS)} tokens`);
    console.log("-------------------------\n");
    
    const confirmation = readlineSync.question("This will send multiple transactions from your wallet. Are you sure you want to proceed? (yes/no): ");
    if (confirmation.toLowerCase() !== 'yes') {
      console.log("Airdrop cancelled by user.");
      return;
    }

    // --- 4. Execute Airdrop ---
    console.log("\nStarting airdrop...");
    const erc20TransferAbi = [{"inputs":[{"name":"to","type":"address"},{"name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}] as const;
    let successful = 0, failed = 0;

    for (const [index, transfer] of allTransfers.entries()) {
      const { recipient, amount, tier } = transfer;
      console.log(`[${index + 1}/${allTransfers.length}] Sending ${formatUnits(amount, TOKEN_DECIMALS)} tokens to ${recipient} (${tier})...`);
      try {
        const hash = await walletClient.writeContract({
          address: tokenAddress,
          abi: erc20TransferAbi,
          functionName: 'transfer',
          args: [recipient, amount],
        });
        console.log(`  Tx Sent: ${hash}`);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === 'success') {
          console.log("  ✅ Success!");
          successful++;
        } else {
          console.log("  ❌ Transaction failed (reverted).");
          failed++;
        }
      } catch (error: any) {
        console.error(`  ❌ Error: ${error.shortMessage || error.message}`);
        failed++;
      }
    }

    // --- 5. Final Report ---
    console.log("\n--- Airdrop Complete ---");
    console.log(`Successful transfers: ${successful}`);
    console.log(`Failed transfers:     ${failed}`);
    console.log("------------------------");
  });