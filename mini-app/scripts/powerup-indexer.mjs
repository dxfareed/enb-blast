import { createPublicClient, webSocket, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const powerUpActivatedAbi = {
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
      "name": "userAddress",
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
  "name": "PowerUpActivated",
  "type": "event"
};

const PRISMA_KEEP_ALIVE_INTERVAL = 60 * 1000;
const PROCESSOR_RETRY_DELAY = 15000;
const PROCESSOR_FALLBACK_INTERVAL = 10000;

const eventQueue = [];
let isProcessing = false;

async function processPowerUpEvent(log) {
  const { fid, userAddress } = log.args;
  const txHash = log.transactionHash;

  console.log(`  - ➡️  Attempting to process PowerUp for wallet ${userAddress} (FID: ${fid})...`);

  const block = await client.getBlock({ blockHash: log.blockHash });
  const timestamp = new Date(Number(block.timestamp) * 1000);
  
  const sixHoursFromNow = new Date(timestamp.getTime() + 6 * 60 * 60 * 1000);

  const dbUser = await prisma.user.findUnique({
    where: { fid: BigInt(fid) },
  });

  if (!dbUser) {
    console.warn(`     - ⚠️  User with FID ${fid} not found in DB. Power-up will not be indexed.`);
    return;
  }

  await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      powerupExpiration: sixHoursFromNow,
    },
  });

  console.log(` - ✅ Successfully indexed power-up for FID: ${fid}. Expiration: ${sixHoursFromNow.toISOString()}`);
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
      await processPowerUpEvent(log);
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
  console.log("🚀 Starting power-up indexer...");

  // TODO: Replace with the actual contract address
  const contractAddress = "0x333bc453a8fc5aab73badd6a93a12e5133f90c53"; 
  if (!contractAddress || !process.env.NEXT_PUBLIC_WS) {
    throw new Error("Contract address or NEXT_PUBLIC_WS not found in environment variables.");
  }

  client.watchContractEvent({
    address: contractAddress,
    abi: [powerUpActivatedAbi],
    eventName: 'PowerUpActivated',
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
