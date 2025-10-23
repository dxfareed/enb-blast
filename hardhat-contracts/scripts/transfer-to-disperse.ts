import hre from "hardhat";
import { Address, parseUnits } from "viem";
import { REWARD_AMOUNTS } from "./tiers";

async function main() {
  // Full tier recipients (1st to 10th place)
  const recipients: Address[] = [
    "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B", // 1st place
    "0x4B2099D560290C5B68b187A98593F362A4a0305E", // 2nd place
    "0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB", // 3rd place
    "0x617F2E2fD72FD9D5503197092AC168C91465E7f2", // 4th place
    "0x1Db3439a222C519ab44bb1144fC28167b4Fa6EE6", // 5th place
    "0x14723A09ACff6D2A60DcdF7aA4AFf308FDDC160C", // 6th place
    "0x45553E21225702d20475e352F34f5493123de456", // 7th place
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // 8th place
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // 9th place
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // 10th place
  ];

  const totalAmount = recipients.reduce((acc, _, i) => {
    const rank = i + 1;
    const reward = REWARD_AMOUNTS[rank];
    if (!reward) {
      throw new Error(`No reward amount defined for rank ${rank}`);
    }
    return acc + reward;
  }, 0);

  // Spender and token details
  const disperseContractAddress: Address = "0x0a68985b49eadb7437c9c623e35a701c11120c44"; // Disperse contract address
  const tokenAddress: Address = "0x0a0E0FccC2c799845214E8E5583E44479EC02a23";
  const tokenDecimals = 18;

  // Parse the amount from the hardcoded string
  const amountToTransfer = parseUnits(totalAmount.toString(), tokenDecimals);

  try {
    // Get the wallet client to sign and send the transaction
    const [walletClient] = await hre.viem.getWalletClients();
    const account = walletClient.account;

    if (!account) {
      throw new Error("No account found. Check your hardhat.config.ts and .env file.");
    }

    console.log(`\nTransferring tokens to Disperse contract: ${disperseContractAddress}`);
    console.log(`Token contract: ${tokenAddress}`);
    console.log(`Owner address: ${account.address}`);
    console.log(`Amount: ${totalAmount} tokens`);
    console.log('------------------');

    // Minimal ABI for the ERC20 transfer function
    const erc20Abi = [
      {
        "inputs": [{ "name": "recipient", "type": "address" }, { "name": "amount", "type": "uint256" }],
        "name": "transfer",
        "outputs": [{ "name": "", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ] as const;

    console.log("Sending transfer transaction...");
    const hash = await walletClient.writeContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [disperseContractAddress, amountToTransfer],
      account: account
    });

    console.log(`✅ Transaction sent! Hash: ${hash}`);
    
    const publicClient = await hre.viem.getPublicClient();
    console.log("Waiting for transaction confirmation...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.log("✅ Transfer successful!");
      console.log(`   Transaction confirmed in block number: ${receipt.blockNumber}`);
    } else {
       console.error('❌ Transaction failed!');
    }

  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
