import hre from "hardhat";
import { Address, parseUnits } from "viem";

async function main() {
  const disperseContractAddress: Address = "0x0a68985b49eadb7437c9c623e35a701c11120c44";
  const tokenAddress: Address = "0x0a0E0FccC2c799845214E8E5583E44479EC02a23";
  const tokenDecimals = 18;

  const recipients: Address[] = [
    "0xE59DF381684a7cf4D3E1177e68569b5D13F9585a",
    "0xE59DF381684a7cf4D3E1177e68569b5D13F9585a",
    "0xE59DF381684a7cf4D3E1177e68569b5D13F9585a"
  ];
  const values = [
    parseUnits("5000", tokenDecimals),
    parseUnits("5000", tokenDecimals),
    parseUnits("5000", tokenDecimals)
  ];

  try {
    const [walletClient] = await hre.viem.getWalletClients();
    const account = walletClient.account;

    if (!account) {
      throw new Error("No account found. Check your hardhat.config.ts and .env file.");
    }

    console.log(`
Dispersing tokens from: ${account.address}`);
    console.log(`Disperse contract: ${disperseContractAddress}`);
    console.log(`Token contract: ${tokenAddress}`);
    console.log('------------------');

    const disperseAbi = [
      {
        "inputs": [
          { "internalType": "address", "name": "token", "type": "address" },
          { "internalType": "address[]", "name": "recipients", "type": "address[]" },
          { "internalType": "uint256[]", "name": "values", "type": "uint256[]" }
        ],
        "name": "disperseToken",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ] as const;

    console.log("Sending disperse transaction...");
    const hash = await walletClient.writeContract({
      address: disperseContractAddress,
      abi: disperseAbi,
      functionName: 'disperseToken',
      args: [tokenAddress, recipients, values],
      account: account
    });

    console.log(`✅ Transaction sent! Hash: ${hash}`);

    const publicClient = await hre.viem.getPublicClient();
    console.log("Waiting for transaction confirmation...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.log("✅ Token dispersal successful!");
      console.log(`   Transaction confirmed in block number: ${receipt.blockNumber}`);
    } else {
      console.error('❌ Transaction failed!');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
