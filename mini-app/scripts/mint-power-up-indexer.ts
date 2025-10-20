import { createPublicClient, webSocket, Log } from 'viem';
import { base } from 'viem/chains';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { MINT_POWERUP_NFT_CONTRACT_ADDRESS, MINT_POWERUP_NFT_CONTRACT_ABI } from '@/app/utils/constants';

dotenv.config();

const prisma = new PrismaClient();

type MintEventLog = Log & {
  args: {
    fid?: bigint;
    minter?: `0x${string}`;
    tokenId?: bigint;
    price?: bigint;
  };
};

const PRISMA_KEEP_ALIVE_INTERVAL = 60 * 1000;
const PROCESSOR_RETRY_DELAY = 15000;
const PROCESSOR_FALLBACK_INTERVAL = 10000;

const eventQueue: MintEventLog[] = [];
let isProcessing = false;

async function processMintEvent(log: MintEventLog) {
  const { fid, minter } = log.args;

  if (!fid || !minter) {
    console.warn('Skipping event with missing fid or minter', log);
    return;
  }

  console.log(`  - ➡️  Attempting to process PowerUp NFT Mint for wallet ${minter} (FID: ${fid})...`);

  if (!log.blockHash) {
    console.warn(`     - ⚠️  Skipping event with null blockHash (likely pending): ${log.transactionHash}`);
    return;
  }

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
      await processMintEvent(log);
      eventQueue.shift();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error(`   - ❌ DB Error processing txHash ${log.transactionHash}. Will retry in ${PROCESSOR_RETRY_DELAY / 1000}s.`, errorMessage);
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
});

const client = createPublicClient({
  chain: base,
  transport,
});

async function main() {
  console.log("🚀 Starting PowerUp NFT mint indexer...");

  if (!MINT_POWERUP_NFT_CONTRACT_ADDRESS || !process.env.NEXT_PUBLIC_WS) {
    throw new Error("Contract address or NEXT_PUBLIC_WS not found in environment variables.");
  }

  client.watchContractEvent({
    address: MINT_POWERUP_NFT_CONTRACT_ADDRESS,
    abi: MINT_POWERUP_NFT_CONTRACT_ABI,
    eventName: 'PowerUpMinted',
    onLogs: (logs: MintEventLog[]) => {
      console.log(`✅ ${logs.length} mint event(s) received from chain! Pushing to queue...`);
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
