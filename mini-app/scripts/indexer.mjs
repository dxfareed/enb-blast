import { createPublicClient, webSocket, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const tokensClaimedAbi = {
  type: 'event',
  name: 'TokensClaimed',
  inputs: [
    { name: 'user', type: 'address', indexed: true },
    { name: 'amount', type: 'uint256', indexed: false },
    { name: 'nonce', type: 'uint256', indexed: false },
  ],
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;
const KEEP_ALIVE_INTERVAL = 60 * 1000; // 1 minute

const RETRYABLE_ERROR_CODES = new Set(['P1001', 'P2028']);

async function processEvent(log, retryCount = 0) {
  const { user, amount, nonce } = log.args;
  const txHash = log.transactionHash;

  console.log(`✅ Event received! Processing Nonce: ${nonce} for user ${user}...`);

  try {
    const block = await client.getBlock({ blockHash: log.blockHash });
    const timestamp = new Date(Number(block.timestamp) * 1000);
    const amountDecimal = formatUnits(amount, 18);
    const points = parseFloat(amountDecimal) * 10;

    const dbUser = await prisma.user.findUnique({
      where: { walletAddress: user.toLowerCase() },
    });

    if (!dbUser) {
      console.warn(`   - User ${user} not found in DB. Claim will not be indexed.`);
      return;
    }

    const { streak, lastClaimedAt, claimsToday } = dbUser;

    const isSameDay = lastClaimedAt
      ? timestamp.getUTCFullYear() === lastClaimedAt.getUTCFullYear() &&
        timestamp.getUTCMonth() === lastClaimedAt.getUTCMonth() &&
        timestamp.getUTCDate() === lastClaimedAt.getUTCDate()
      : false;

    const newClaimsToday = isSameDay ? claimsToday + 1 : 1;

    let newStreak = 1;
    if (lastClaimedAt) {
      const yesterday = new Date(timestamp);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const isLastClaimYesterday =
        lastClaimedAt.getUTCFullYear() === yesterday.getUTCFullYear() &&
        lastClaimedAt.getUTCMonth() === yesterday.getUTCMonth() &&
        lastClaimedAt.getUTCDate() === yesterday.getUTCDate();

      if (isLastClaimYesterday) {
        newStreak = streak + 1;
      } else if (isSameDay) {
        newStreak = streak;
      }
    }

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
        },
      });
    });

    console.log(`   - ✅ Successfully indexed claim with txHash: ${txHash}`);
  } catch (error) {
    if (error.code === 'P2002') {
      console.warn(`   - ℹ️  Claim with txHash ${txHash} already exists. Skipping.`);
    } else if (RETRYABLE_ERROR_CODES.has(error.code) && retryCount < MAX_RETRIES) {
      console.warn(`   - ⚠️  A transient database error occurred (${error.code}). Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
      await new Promise((res) => setTimeout(res, RETRY_DELAY));
      await processEvent(log, retryCount + 1);
    } else {
      console.error(`   - ❌ Error processing event for txHash ${txHash} after ${retryCount} retries:`, error);
    }
  }
}

// Use a WebSocket transport for real-time events.
const transport = webSocket(process.env.process.env.NEXT_PUBLIC_WS, {
  // These retry parameters are for the WebSocket connection itself.
  retryCount: 5,
  retryDelay: 5000,
  async onConnect() {
    console.log("... ✅ WebSocket connection established. Listening for events... 👂");
  },
  onDisconnect(error) {
    console.log(`... 🔌 WebSocket connection lost. Attempting to reconnect... Error: ${error}`);
  },
});

const client = createPublicClient({
  chain: base,
  transport,
});

let lastEventTimestamp = Date.now();

async function main() {
  console.log("🚀 Starting viem-based indexer...");

  const contractAddress = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("NEXT_PUBLIC_GAME_CONTRACT_ADDRESS not found in .env file.");
  }

  // This will watch for the event and automatically handle reconnections.
  client.watchContractEvent({
    address: contractAddress,
    abi: [tokensClaimedAbi],
    eventName: 'TokensClaimed',
    onLogs: (logs) => {
      lastEventTimestamp = Date.now();
      for (const log of logs) {
        processEvent(log);
      }
    },
    onError: (error) => {
        console.error("❗️ Error in event watcher:", error);
    }
  });

  // Keep the database connection alive
  setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("   - 핑 (Ping) DB connection is alive. ✅");
    } catch (error) {
      console.error("   - 핑 (Ping) DB connection keep-alive failed:", error);
    }
  }, KEEP_ALIVE_INTERVAL);

  // Health check for the WebSocket connection
  setInterval(async () => {
    const now = Date.now();
    if (now - lastEventTimestamp > 2 * KEEP_ALIVE_INTERVAL) { // 2 minutes
      console.log("... 🧐 No events received recently. Checking connection...");
      try {
        const blockNumber = await client.getBlockNumber();
        console.log(`... ✅ Connection is healthy. Current block number: ${blockNumber}`);
        lastEventTimestamp = now; // Reset timestamp after successful check
      } catch (error) {
        console.error("... ❌ Connection check failed. The watcher should attempt to reconnect.", error);
      }
    }
  }, KEEP_ALIVE_INTERVAL);
}

main().catch(async (error) => {
  console.error("Indexer failed with a critical error:", error);
  await prisma.$disconnect();
  process.exit(1);
});