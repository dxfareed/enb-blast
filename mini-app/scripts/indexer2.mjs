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

const PRISMA_KEEP_ALIVE_INTERVAL = 60 * 1000;
const PROCESSOR_RETRY_DELAY = 15000;
const PROCESSOR_FALLBACK_INTERVAL = 10000;

const eventQueue = [];
let isProcessing = false;

async function processEvent(log) {
  const { fid, claimingWallet, amount, nonce } = log.args;
  const txHash = log.transactionHash;

  console.log(`  - ➡️  Attempting to process Nonce: ${nonce} for wallet ${claimingWallet} (FID: ${fid})...`);

  const existingClaim = await prisma.claim.findUnique({
    where: { txHash },
  });

  if (existingClaim) {
    console.warn(`     - ℹ️  Claim with txHash ${txHash} already exists. Skipping.`);
    return;
  }

  const block = await client.getBlock({ blockHash: log.blockHash });
  const timestamp = new Date(Number(block.timestamp) * 1000);
  const amountDecimal = formatUnits(amount, 18);
  const points = parseFloat(amountDecimal) * 10;

  const dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { walletAddress: claimingWallet.toLowerCase() },
        { verifiedWallets: { has: claimingWallet.toLowerCase() } }
      ]
    },
  });

  if (!dbUser) {
    console.warn(`     - ⚠️  User with wallet ${claimingWallet} not found in DB. Claim will not be indexed.`);
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

  console.log(` - ✅ Successfully indexed claim with txHash: ${txHash}`);
}

async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  if (eventQueue.length > 0) {
    console.log(`   - 🗂️  Checking queue... ${eventQueue.length} events pending.`);
  }

  while (eventQueue.length > 0) {
    const log = eventQueue[0];

    try {
      await processEvent(log);
      eventQueue.shift();
    } catch (error) {
      console.error(`   - ❌ DB Error processing txHash ${log.transactionHash}. Will retry in ${PROCESSOR_RETRY_DELAY / 1000}s.`, error.message);
      isProcessing = false;
      await new Promise((res) => setTimeout(res, PROCESSOR_RETRY_DELAY));
      processQueue();
      return;
    }
  }

  isProcessing = false;
}

const transport = webSocket(process.env.NEXT_PUBLIC_WS, {
  retryCount: 5,
  retryDelay: 5000,
  ping: true,
  pingInterval: 15_000,
  pongTimeout: 10_000,
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

  const contractAddress = "0xe7f16d266dbda5451d0a3f67d9404ff2e8178d91";
  if (!contractAddress || !process.env.NEXT_PUBLIC_WS) {
    throw new Error("Contract address or NEXT_PUBLIC_WS not found in environment variables.");
  }

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
        console.error("❗️ Critical Error in event watcher: The event listener has stopped.", error);
        console.log("   - ℹ️  Viem will automatically attempt to reconnect the WebSocket and resume listening.");
    }
  });

  setInterval(processQueue, PROCESSOR_FALLBACK_INTERVAL);

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
