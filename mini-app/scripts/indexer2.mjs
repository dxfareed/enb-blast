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
const KEEP_ALIVE_INTERVAL = 60 * 1000; 

const RETRYABLE_ERROR_CODES = new Set(['P1001', 'P2028']);

function isSameDay(date1, date2) {
  if (!date1 || !date2) return false;
  return date1.getUTCFullYear() === date2.getUTCFullYear() &&
         date1.getUTCMonth() === date2.getUTCMonth() &&
         date1.getUTCDate() === date2.getUTCDate();
}

async function processEvent(user, amount, nonce, event, retryCount = 0) {
  console.log(`✅ Event received! Processing Nonce: ${nonce}...`);
  
  const txHash = event.log.transactionHash;

  try {
    const block = await event.log.getBlock();
    const timestamp = new Date(block.timestamp * 1000);
    const amountDecimal = ethers.formatUnits(amount, 18);
    const points = parseFloat(amountDecimal) * 10;

    const dbUser = await prisma.user.findUnique({
      where: { walletAddress: user.toLowerCase() },
    });

    if (!dbUser) { 
      console.warn(`   - User ${user} not found in DB. Claim will not be indexed.`);
      return;
    }

    let newStreak = 1;
    if (dbUser.lastClaimedAt) {
        if (!isSameDay(dbUser.lastClaimedAt, timestamp)) {
            const yesterday = new Date(timestamp);
            yesterday.setUTCDate(yesterday.getUTCDate() - 1);
            if (isSameDay(dbUser.lastClaimedAt, yesterday)) {
                newStreak = dbUser.streak + 1;
            }
        } else {
            newStreak = dbUser.streak; 
        }
    }

    const isNewDay = !dbUser.lastClaimDate || !isSameDay(dbUser.lastClaimDate, timestamp);
    const newClaimsToday = isNewDay ? 1 : dbUser.claimsToday + 1;

    await prisma.$transaction(async (tx) => {
      await tx.claim.create({
        data: {
          txHash: txHash,
          amount: amountDecimal,
          timestamp: timestamp,
          userId: dbUser.id,
        },
      });

      await tx.user.update({
        where: { id: dbUser.id },
        data: { 
          totalClaimed: { increment: parseFloat(amountDecimal) },
          totalPoints: { increment: points },
          weeklyPoints: { increment: points },
          streak: newStreak,
          lastClaimedAt: timestamp,
          claimsToday: newClaimsToday,
          lastClaimDate: timestamp,
        },
      });
    });

    console.log(`   - ✅ Successfully indexed claim with txHash: ${txHash}`);

  } catch (error) {
    if (error.code === 'P2002') {
      console.warn(`   - ℹ️  Claim with txHash ${txHash} already exists. Skipping.`);
    } else if (RETRYABLE_ERROR_CODES.has(error.code) && retryCount < MAX_RETRIES) {
      console.warn(`   - ⚠️  A transient database error occurred (${error.code}). Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
      await new Promise(res => setTimeout(res, RETRY_DELAY));
      await processEvent(user, amount, nonce, event, retryCount + 1);
    } else {
      console.error(`   - ❌ Error processing event for txHash ${txHash} after ${retryCount} retries:`, error);
    }
  }
}

async function connectAndListen() {
  console.log("... 🔌 Attempting to connect to WebSocket provider...");
  const provider = new ethers.WebSocketProvider(process.env.TESTNET_RPC_WSS_URL);
  const contractAddress = "0xb1d6f75234aaed66a758fcd3722ae843696ee938";

  if (!contractAddress) { throw new Error("Contract address not found."); }

  const contract = new ethers.Contract(contractAddress, GAME_CONTRACT_ABI, provider);

  let heartbeatInterval;
  let dbKeepAliveInterval;

  const cleanup = () => {
    console.log("🧹 Cleaning up old listeners and timers.");
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (dbKeepAliveInterval) clearInterval(dbKeepAliveInterval);
    contract.removeAllListeners();
  };

  const reconnect = () => {
    console.log("💔 Connection lost. Reconnecting in 10 seconds...");
    cleanup();
    setTimeout(connectAndListen, 10000);
  };

  heartbeatInterval = setInterval(async () => {
    try {
      await provider.getBlockNumber();
    } catch (error) {
      console.error("   - 💔 Heartbeat failed, connection likely lost. Triggering reconnect.");
      reconnect();
    }
  }, 15000);

  dbKeepAliveInterval = setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("   - 핑 (Ping) DB connection is alive. ✅");
    } catch (error) {
      console.error("   - 핑 (Ping) DB connection keep-alive failed:", error);
    }
  }, KEEP_ALIVE_INTERVAL);

  if (provider._websocket) {
    provider._websocket.on('close', () => {
        console.log('❗️ WebSocket connection closed by provider. Reconnecting...');
        reconnect();
    });
  }

  contract.on("TokensClaimed", (user, amount, nonce, event) => {
    processEvent(user, amount, nonce, event);
  });

  console.log("... ✅ Indexer is running. Waiting for events... 👂");
}

async function main() {
  console.log("🚀 Starting resilient indexer...");
  connectAndListen();
}

main().catch(async (error) => {
  console.error("Indexer failed with a critical error:", error);
  await prisma.$disconnect();
  process.exit(1);
});
