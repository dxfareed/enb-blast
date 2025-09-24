import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const GAME_CONTRACT_ABI = [
  "event TokensClaimed(address indexed user, uint256 amount, uint256 nonce)"
];

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;
const POLLING_INTERVAL = 2000;

async function processEvent(user, amount, nonce, event, retryCount = 0) {
  console.log(`✅ Event received! Processing Nonce: ${nonce}...`);
  
  const txHash = event.log.transactionHash;

  try {
    const block = await event.log.getBlock();
    const timestamp = new Date(block.timestamp * 1000);
    
    await prisma.$transaction(async (tx) => {
      const dbUser = await tx.user.findUnique({ where: { walletAddress: user.toLowerCase() } });
      if (!dbUser) { 
        console.warn(`   - User ${user} not found in DB. Claim will not be indexed.`);
        return;
      }

      await tx.claim.create({
        data: {
          txHash: txHash,
          amount: ethers.formatUnits(amount, 18),
          timestamp: timestamp,
          userId: dbUser.id,
        },
      });

      await tx.user.update({
        where: { id: dbUser.id },
        data: { totalClaimed: { increment: parseFloat(ethers.formatUnits(amount, 18)) } },
      });
    });

    console.log(`   - ✅ Successfully indexed claim with txHash: ${txHash}`);

  } catch (error) {
    if (error.code === 'P2028' && retryCount < MAX_RETRIES) {
      console.warn(`   - ⚠️ Database connection timed out. Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
      await prisma.$disconnect();
      await prisma.$connect();
      await new Promise(res => setTimeout(res, RETRY_DELAY));
      await processEvent(user, amount, nonce, event, retryCount + 1);
    
    
    } else if (error.code === 'P2002') {
      console.warn(`   - ℹ️  Claim with txHash ${txHash} already exists. Skipping.`);
    
    } else {
      console.error(`   - ❌ Error processing event after ${retryCount} retries:`, error);
    }
  }
}

async function main() {
  console.log("🚀 Starting resilient indexer...");

  try {
    console.log("🔌 Connecting to database...");
    await prisma.$connect();
    console.log("✅ Database connection successful.");
  } catch (error) {
    console.error("❌ Failed to connect to the database on startup. Exiting.", error);
    process.exit(1);
  }

  const provider = new ethers.WebSocketProvider(process.env.TESTNET_RPC_WSS_URL);
  const contractAddress = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS;

  if (!contractAddress) { throw new Error("Contract address not found."); }
  
  const contract = new ethers.Contract(contractAddress, GAME_CONTRACT_ABI, provider);


  contract.on("TokensClaimed", (user, amount, nonce, event) => {
    processEvent(user, amount, nonce, event);
  });

  console.log("... Indexer is running. Waiting for events...");
}

main().catch(async (error) => {
  console.error("Indexer failed:", error);
  await prisma.$disconnect();
  process.exit(1);
});