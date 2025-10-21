import { task } from "hardhat/config";
import { Address, parseUnits } from "viem";

task("approve-spender", "Approves a specified address to spend a certain amount of tokens")
  .addPositionalParam("amount", "The amount of tokens to approve (e.g., '100')")
  .setAction(async (taskArgs, hre) => {
    // Spender and token details
    const spenderAddress: Address = "0x632b3cfC1B123767f8AaBD9246F6115a52c1f151";
    const tokenAddress: Address = "0xf73978b3a7d1d4974abae11f696c1b4408c027a0";
    const tokenDecimals = 18;

    // Parse the amount from command-line argument using viem's utility
    const amountToApprove = parseUnits(taskArgs.amount, tokenDecimals);

    try {
      // Get the wallet client to sign and send the transaction
      const [walletClient] = await hre.viem.getWalletClients();
      const account = walletClient.account;

      if (!account) {
        throw new Error("No account found. Check your hardhat.config.ts and .env file.");
      }

      console.log(`\nApproving spender: ${spenderAddress}`);
      console.log(`Token contract: ${tokenAddress}`);
      console.log(`Owner address: ${account.address}`);
      console.log(`Amount: ${taskArgs.amount} tokens`);
      console.log('------------------');

      // Minimal ABI for the ERC20 approve function
      const erc20Abi = [
        {
          "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }],
          "name": "approve",
          "outputs": [{ "name": "", "type": "bool" }],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ] as const;

      console.log("Sending approval transaction...");
      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spenderAddress, amountToApprove],
        account: account
      });

      console.log(`✅ Transaction sent! Hash: ${hash}`);
      
      const publicClient = await hre.viem.getPublicClient();
      console.log("Waiting for transaction confirmation...");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        console.log("✅ Approval successful!");
        console.log(`   Transaction confirmed in block number: ${receipt.blockNumber}`);
      } else {
         console.error('❌ Transaction failed!');
      }

    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });