import { createPublicClient, webSocket, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// ABI item for the event we are interested in
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

    const dbUser = await prisma.user.findUnique({
      where: { walletAddress: user.toLowerCase() },
    });

    if (!dbUser) {
      console.warn(`   - User ${user} not found in DB. Claim will not be indexed.`);
      return;
    }

    await prisma.claim.create({
      data: {
        txHash: txHash,
        amount: amountDecimal,
        timestamp: timestamp,
        userId: dbUser.id,
      },
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
const transport = webSocket("wss://base-rpc.publicnode.com", {
  // These retry parameters are for the WebSocket connection itself.
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

  const contractAddress = "0x03b922ee0573e52e09e6c8033c012500487a2384";
  if (!contractAddress) {
    throw new Error("Contract address not found.");
  }

  // This will watch for the event and automatically handle reconnections.
  client.watchContractEvent({
    address: contractAddress,
    abi: [tokensClaimedAbi],
    eventName: 'TokensClaimed',
    onLogs: (logs) => {
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
}

main().catch(async (error) => {
  console.error("Indexer failed with a critical error:", error);
  await prisma.$disconnect();
  process.exit(1);
});