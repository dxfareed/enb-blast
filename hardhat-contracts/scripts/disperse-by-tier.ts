import hre from "hardhat";
import { Address, parseUnits } from "viem";
import { REWARD_AMOUNTS } from "./tiers";

async function main() {
  const disperseContractAddress: Address = "0xfbed6b9a1e11f95eac93aec35f0a7f1f1719ad15";
  const tokenAddress: Address = "0xbfa733702305280F066D470afDFA784fA70e2649";
  const tokenDecimals = 18;

  // Full tier recipients (1st to 10th place)
  const recipients: Address[] = [
    "0x22ecd246e5a2843c318d02f5b83f85e5fa370b1a", // 1st place - emely
    "0x4e30bcb75310e375a62864aec69c28d2503cba0d", // 2nd place - web3focus
    "0x15bf402cfe2911123e7c75106c181db5138b733c", // 3rd place - mjnice
    "0x5187384ff3b6e4490c6a488002ba29d766cb626d", // 4th place - ezeozone
    "0x6949b7ee38d4cbb5224bb8d7083210d390c0d449", // 5th place - blownshades
    "0xd559e433718b1f2667fde7c859fc982cf0bc491f", // 6th place - richieboston
    "0xfdde08bf9c732e249d2dc9261d49a653e47271c5", // 7th place - gacey12
    "0x8b4db3b7e3382343e813c12b4b54082b9a731a15", // 8th place - dedensarief93
    "0x22dfa84d0ecbb58c9460ffc2a1ad32a580402b2a", // 9th place - catalunya
    "0x2d665e415f0c724452a8bddf4a6cfd2743717e8a", // 10th place - metatronvietnam
  ];

  const values = recipients.map((_, i) => {
    const rank = i + 1;
    const reward = REWARD_AMOUNTS[rank];
    if (!reward) {
      throw new Error(`No reward amount defined for rank ${rank}`);
    }
    return parseUnits(reward.toString(), tokenDecimals);
  });

  try {
    const [walletClient] = await hre.viem.getWalletClients();
    const account = walletClient.account;

    if (!account) {
      throw new Error("No account found. Check your hardhat.config.ts and .env file.");
    }

    console.log(`\nDispersing tokens by tier from: ${account.address}`);
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