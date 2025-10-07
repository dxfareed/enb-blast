import { createPublicClient, webSocket, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const tokensClaimedAbi = {
  "anonymous": false,
  "inputs": [
    {
      "indexed": true,
      "internalType": "uint256",
      "name": "fid",
      "type": "uint256"
    },
    {
      "indexed": true,
      "internalType": "address",
      "name": "claimingWallet",
      "type": "address"
    },
    {
      "indexed": false,
      "internalType": "uint256",
      "name": "amount",
      "type": "uint256"
    },
    {
      "indexed": false,
      "internalType": "uint256",
      "name": "nonce",
      "type": "uint256"
    }
  ],
  "name": "TokensClaimed",
  "type": "event"
};

// --- Timing Constants ---
const PRISMA_KEEP_ALIVE_INTERVAL = 60 * 1000; // 1 minute
const WEBSOCKET_KEEP_ALIVE_INTERVAL = 30 * 1000; // 30 seconds (must be shorter than network timeout)
const PROCESSOR_RETRY_DELAY = 15000; // 15 seconds
const PROCESSOR_FALLBACK_INTERVAL = 10000; // 10 seconds

// --- Resilient Queue System ---
const eventQueue = [];
let isProcessing = false;
// --- End Queue System ---


/**
 * Processes a single event log. This function is designed to throw an error on failure,
 * which will be caught by the queue processor, allowing for retries.
 * @param {object} log - The event log object from viem.
 */
async function processEvent(log) {
  const { fid, claimingWallet, amount, nonce } = log.args;
  const txHash = log.transactionHash;

  console.log(`  - ➡️  Attempting to process Nonce: ${nonce} for wallet ${claimingWallet} (FID: ${fid})...`);

  // 1. Check if claim already exists in the DB to prevent duplicates
  const existingClaim = await prisma.claim.findUnique({
    where: { txHash },
  });

  if (existingClaim) {
    console.warn(`     - ℹ️  Claim with txHash ${txHash} already exists. Skipping.`);
    return; // Exit successfully
  }

  // 2. Fetch block details for timestamp
  const block = await client.getBlock({ blockHash: log.blockHash });
  const timestamp = new Date(Number(block.timestamp) * 1000);
  const amountDecimal = formatUnits(amount, 18);
  const points = parseFloat(amountDecimal) * 10;

  // 3. Find the user in our database
  const dbUser = await prisma.user.findUnique({
    where: { walletAddress: claimingWallet.toLowerCase() },
  });

  if (!dbUser) {
    console.warn(`     - ⚠️  User with wallet ${claimingWallet} not found in DB. Claim will not be indexed.`);
    return; // Exit successfully
  }

  // 4. Calculate streak and daily claims (your existing logic)
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

  // 5. Execute database transaction
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

  console.log(` - ✅ Successfully indexed claim with txHash: ${txHash}`);
}

/**
 * The queue processor. It runs in a loop, attempting to process events from the front
 * of the queue. If an event fails, it waits and retries the same event later.
 */
async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  if (eventQueue.length > 0) {
    console.log(`   - 🗂️  Checking queue... ${eventQueue.length} events pending.`);
  }

  while (eventQueue.length > 0) {
    const log = eventQueue[0]; // Peek at the first event without removing it

    try {
      await processEvent(log);
      eventQueue.shift(); // Success! Remove the event from the queue.
    } catch (error) {
      console.error(`   - ❌ DB Error processing txHash ${log.transactionHash}. Will retry in ${PROCESSOR_RETRY_DELAY / 1000}s.`, error.message);
      // Don't remove the event from the queue. Wait before the next attempt.
      isProcessing = false;
      await new Promise((res) => setTimeout(res, PROCESSOR_RETRY_DELAY));
      // After waiting, restart the processing loop
      processQueue();
      return; // Exit this loop instance to start a fresh one
    }
  }

  isProcessing = false;
}

// Use a WebSocket transport for real-time events.
const transport = webSocket(process.env.NEXT_PUBLIC_WS, {
  retryCount: 5,
  retryDelay: 5000,
  async onConnect() {
    console.log("... ✅ WebSocket connection established. Listening for events... 👂");
  },
  onDisconnect() {
    console.log("... 🔌 WebSocket connection lost. Attempting to reconnect...");
  },
});

const client = createPublicClient({
  chain: base,
  transport,
});

async function main() {
  console.log("🚀 Starting viem-based indexer...");

  const contractAddress = "0xc3fEb4f9E4ca293595aeA1bb6f1A7E0764deD4eD";
  if (!contractAddress || !process.env.NEXT_PUBLIC_WS) {
    throw new Error("Contract address or NEXT_PUBLIC_WS not found in environment variables.");
  }

  // This watcher's only job is to add events to our in-memory queue.
  client.watchContractEvent({
    address: contractAddress,
    abi: [tokensClaimedAbi],
    eventName: 'TokensClaimed',
    onLogs: (logs) => {
      console.log(`✅ ${logs.length} event(s) received from chain! Pushing to queue...`);
      for (const log of logs) {
        if (!eventQueue.some(queuedLog => queuedLog.transactionHash === log.transactionHash)) {
            eventQueue.push(log);
        }
      }
      processQueue();
    },
    onError: (error) => {
        console.error("❗️ Critical Error in event watcher:", error);
    }
  });

  // Periodically try to process the queue as a fallback mechanism
  setInterval(processQueue, PROCESSOR_FALLBACK_INTERVAL);

  // --- NEW: WebSocket Keep-Alive ---
  // This prevents the connection from being dropped by network devices during long idle periods.
  setInterval(async () => {
    try {
      const blockNumber = await client.getBlockNumber();
      console.log(`   - ❤️  WebSocket Keep-Alive: Still connected at block ${blockNumber}.`);
    } catch (error) {
      console.error("   - 💔 WebSocket Keep-Alive failed. Connection might be dead. Viem will attempt to reconnect.", error.message);
    }
  }, WEBSOCKET_KEEP_ALIVE_INTERVAL);


  // Keep the Prisma database connection alive
  setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      console.error("   - 핑 (Ping) DB connection keep-alive failed:", error);
    }
  }, PRISMA_KEEP_ALIVE_INTERVAL);
}

main().catch(async (error) => {
  console.error("Indexer failed with a critical error:", error);
  await prisma.$disconnect();
  process.exit(1);
});