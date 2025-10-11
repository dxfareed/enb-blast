
import 'dotenv/config';
import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';
import { GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI } from '../app/utils/constants';

// Setup Viem Public Client
const publicClient = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org"),
});

const COOLDOWN_PERIOD_SECONDS = 12 * 60 * 60;

async function checkUserProfile(fid: number) {
  if (!GAME_CONTRACT_ADDRESS) {
    console.error("Error: GAME_CONTRACT_ADDRESS is not defined in your .env file.");
    return;
  }

  if (isNaN(fid) || fid <= 0) {
    console.error("Error: Please provide a valid FID as an argument.");
    console.log("Usage: ts-node scripts/check-user-profile.ts <FID>");
    return;
  }

  console.log(`🔍 Checking on-chain profile for FID: ${fid}...`);

  try {
    // 1. Fetch max claims per cycle for context
    const maxClaimsPerCycle = await publicClient.readContract({
      address: GAME_CONTRACT_ADDRESS as `0x${string}`,
      abi: GAME_CONTRACT_ABI,
      functionName: 'maxClaimsPerCycle',
    });
    console.log(`
--- Contract Details ---`);
    console.log(`Max Claims Per Cycle: ${maxClaimsPerCycle}`);
    console.log(`Cooldown Period: ${COOLDOWN_PERIOD_SECONDS / 3600} hours`);


    // 2. Fetch the user's profile from the contract
    const {
      lastClaimTimestamp,
      claimsInCurrentCycle,
      totalClaimed
    } = await publicClient.readContract({
      address: GAME_CONTRACT_ADDRESS as `0x${string}`,
      abi: GAME_CONTRACT_ABI,
      functionName: 'getUserProfile',
      args: [BigInt(fid)],
    });

    // 3. Perform calculations and checks
    const now = new Date();
    const nowSeconds = Math.floor(now.getTime() / 1000);
    
    const lastClaimDate = new Date(Number(lastClaimTimestamp) * 1000);
    const cooldownEndsAt = Number(lastClaimTimestamp) + COOLDOWN_PERIOD_SECONDS;
    const cooldownEndsDate = new Date(cooldownEndsAt * 1000);
    
    const timeRemainingSeconds = Math.max(0, cooldownEndsAt - nowSeconds);
    const hours = Math.floor(timeRemainingSeconds / 3600);
    const minutes = Math.floor((timeRemainingSeconds % 3600) / 60);
    const seconds = timeRemainingSeconds % 60;

    const hasMaxClaims = claimsInCurrentCycle >= maxClaimsPerCycle;
    const isCoolingDown = nowSeconds < cooldownEndsAt;

    // 4. Display the results
    console.log(`
--- User Profile (FID: ${fid}) ---`);
    console.log(`Total Claimed: ${formatEther(totalClaimed)}`);
    console.log(`Claims in Current Cycle: ${claimsInCurrentCycle}`);
    console.log(`Last Claim Timestamp: ${lastClaimTimestamp} (${lastClaimDate.toISOString()})`);

    console.log(`
--- Cooldown Status ---`);
    console.log(`Cooldown Ends At: ${cooldownEndsAt} (${cooldownEndsDate.toISOString()})`);

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("\n❌ A critical error occurred during the check:", message);
    if (message.includes("InvalidAddressError")) {
        console.error("Hint: The GAME_CONTRACT_ADDRESS might be missing or incorrect in your .env file.");
    } else if (message.includes("ContractFunctionExecutionError")) {
        console.error("Hint: The contract call failed. This might happen if the user profile does not exist on-chain.");
    }
  }
}

// Get FID from command line arguments
const args = process.argv.slice(2);
const fid = parseInt(args[0], 10);

checkUserProfile(fid);
