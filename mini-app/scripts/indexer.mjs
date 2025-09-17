// scripts/indexer.mjs

import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load all environment variables from your .env file
dotenv.config();

const prisma = new PrismaClient();

// The ABI for the event we care about.
const GAME_CONTRACT_ABI = [
  "event TokensClaimed(address indexed user, uint256 amount, uint256 nonce)"
];

async function main() {
  console.log("🚀 Starting indexer...");

  const provider = new ethers.WebSocketProvider(process.env.TESTNET_RPC_URL);
  const contractAddress = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS;

  if (!contractAddress) {
    throw new Error("Contract address not found in .env file.");
  }

  const contract = new ethers.Contract(contractAddress, GAME_CONTRACT_ABI, provider);

  console.log(`👂 Listening for TokensClaimed events on contract: ${contractAddress}`);

  // This is the core of the indexer. The .on() method listens for events in real-time.
  contract.on("TokensClaimed", async (user, amount, nonce, event) => {
    console.log(`✅ Event received! User: ${user}, Amount: ${ethers.formatUnits(amount, 18)}, Nonce: ${nonce}`);
    
    // The `event` object contains the full transaction details
    const txHash = event.log.transactionHash;
    const block = await event.log.getBlock();
    const timestamp = new Date(block.timestamp * 1000);

    try {
      // Use Prisma to save the data to our database.
      // We use a transaction to ensure both the Claim and the User update happen together.
      await prisma.$transaction(async (tx) => {
        // Find the user's profile in our database
        const dbUser = await tx.user.findUnique({
          where: { walletAddress: user.toLowerCase() },
        });

        if (!dbUser) {
          console.warn(`User ${user} not found in DB. Skipping claim record.`);
          return;
        }

        // 1. Create the Claim record
        await tx.claim.create({
          data: {
            txHash: txHash,
            amount: ethers.formatUnits(amount, 18), // Store as a decimal string
            timestamp: timestamp,
            userId: dbUser.id, // Link it to the user
          },
        });

        // 2. Update the user's totalClaimed amount for the leaderboard
        await tx.user.update({
          where: { id: dbUser.id },
          data: {
            totalClaimed: {
              increment: parseFloat(ethers.formatUnits(amount, 18)),
            },
          },
        });
      });

      console.log(`   - Successfully indexed claim with txHash: ${txHash}`);

    } catch (error) {
      // This can happen if two events for the same txHash arrive at once.
      // We check for the unique constraint violation code from Prisma.
      if (error.code === 'P2002') {
        console.warn(`   - Claim with txHash ${txHash} already exists. Skipping.`);
      } else {
        console.error("   - Error processing event:", error);
      }
    }
  });
}

main().catch((error) => {
  console.error("Indexer failed:", error);
  process.exit(1);
});