import { task } from "hardhat/config";
import { Address, parseUnits } from "viem";

task("approve-spender", "Approves a specified address to spend a certain amount of tokens")
  .addPositionalParam("amount", "The amount of tokens to approve (e.g., '100')")
  .setAction(async (taskArgs, hre) => {
    // Spender and token addresses
    const spenderAddress: Address = "0x632b3cfC1B123767f8AaBD9246F6115a52c1f151";
    const tokenAddress: Address = "0xf73978b3a7d1d4974abae11f696c1b4408c027a0";
    const tokenDecimals = 18;

    // The amount of tokens to approve, parsed from the command line argument
    const amountToApprove = parseUnits(taskArgs.amount, tokenDecimals);

    try {
      // Get the wallet client which represents the signer
      const [walletClient] = await hre.viem.getWalletClients();
      const account = walletClient.account;

      if (!account) {
        throw new Error("No account found in wallet client. Please check your Hardhat configuration.");
      }

      console.log(`\nApproving spender: ${spenderAddress}`);
      console.log(`Token contract: ${tokenAddress}`);
      console.log(`Owner address: ${account.address}`);
      console.log(`Amount: ${taskArgs.amount} tokens`);
      console.log('------------------');

      // Minimal ABI for the ERC20 approve function
      const erc20Abi = [
        {
          "constant": false,
          "inputs": [
            {
              "name": "_spender",
              "type": "address"
            },
            {
              "name": "_value",
              "type": "uint256"
            }
          ],
          "name": "approve",
          "outputs": [
            {
              "name": "",
              "type": "bool"
            }
          ],
          "payable": false,
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ] as const; // Use 'as const' for better type inference with Viem

      // Sending the transaction to approve the spender
      console.log("Sending approval transaction...");

      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spenderAddress, amountToApprove],
        account: account
      });

      console.log(`✅ Transaction sent! Hash: ${hash}`);

      // Optional: wait for the transaction to be confirmed
      const publicClient = await hre.viem.getPublicClient();
      console.log("Waiting for transaction confirmation...");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        console.log("✅ Approval successful!");
        console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);
      } else {
         console.error('❌ Transaction failed!');
      }


    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });