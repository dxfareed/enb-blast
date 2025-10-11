import 'dotenv/config';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI } from '../app/utils/constants';

// Setup Viem Public Client
const publicClient = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org"),
});

async function checkRegistration(fid: number) {
  if (!GAME_CONTRACT_ADDRESS) {
    console.error("❌ Error: GAME_CONTRACT_ADDRESS is not defined in your .env file.");
    return;
  }

  if (isNaN(fid) || fid <= 0) {
    console.error("❌ Error: Please provide a valid FID as an argument.");
    console.log("   Usage: npx tsx scripts/check-registration.ts <FID>");
    return;
  }

  console.log(`🔍 Checking registration status for FID: ${fid}...`);

  try {
    const userProfile = await publicClient.readContract({
      address: GAME_CONTRACT_ADDRESS as `0x${string}`,
      abi: GAME_CONTRACT_ABI,
      functionName: 'getUserProfile',
      args: [BigInt(fid)],
    });

    // Based on the contract logic, the call will always succeed.
    // We just need to check the 'isRegistered' flag.
    if (userProfile.isRegistered) {
      const registrationDate = new Date(Number(userProfile.registrationDate) * 1000);
      console.log(`
✅ YES, user is registered.`);
      console.log(`   Registered on: ${registrationDate.toUTCString()}`);
    } else {
      console.log(`
🚫 NO, user is not registered.`);
    }

  } catch (error) {
    // This will now only catch actual errors like network issues or an invalid contract address.
    const message = error instanceof Error ? error.message : String(error);
    console.error("\n❌ An unexpected error occurred during the contract call:", message);
  }
}

// Get FID from command line arguments
const args = process.argv.slice(2);
const fid = parseInt(args[0], 10);

checkRegistration(fid);
