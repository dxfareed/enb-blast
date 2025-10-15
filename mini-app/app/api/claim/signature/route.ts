// app/api/claim/signature/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { 
  createPublicClient, 
  http, 
  keccak256, 
  encodePacked, 
  parseEther 
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { Errors, createClient } from "@farcaster/quick-auth";

// =================================================================================
//                                  CONFIGURATION
// =================================================================================

const publicClient = createPublicClient({ chain: base, transport: http() });

// The full ABI for the getUserProfile function, matching the contract's UserProfileView struct
const GAME_CONTRACT_ABI = [{
  "inputs": [{ "internalType": "uint256", "name": "_fid", "type": "uint256" }],
  "name": "getUserProfile",
  "outputs": [
    {
      "components": [
        { "internalType": "bool", "name": "isRegistered", "type": "bool" },
        { "internalType": "uint256", "name": "registrationDate", "type": "uint256" },
        { "internalType": "uint256", "name": "lastClaimTimestamp", "type": "uint256" },
        { "internalType": "uint256", "name": "claimNonce", "type": "uint256" },
        { "internalType": "uint256", "name": "totalClaimed", "type": "uint256" },
        { "internalType": "uint256", "name": "claimsInCurrentCycle", "type": "uint256" }
      ],
      "internalType": "struct Game.UserProfileView",
      "name": "",
      "type": "tuple"
    }
  ],
  "stateMutability": "view",
  "type": "function"
}] as const;

// A separate ABI snippet just for getting the dynamic max claims variable
const MAX_CLAIMS_ABI = [{
    "inputs": [],
    "name": "maxClaimsPerCycle",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
}] as const;

const client = createClient();

// =================================================================================
//                                HELPER FUNCTIONS
// =================================================================================

// [CORRECTED] This helper now fetches the entire on-chain profile object
async function getOnChainProfile(fid: bigint) {
  return await publicClient.readContract({
    address: process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS as `0x${string}`,
    abi: GAME_CONTRACT_ABI,
    functionName: 'getUserProfile',
    args: [fid]
  });
}

// Helper to fetch the current claim limit from the contract
async function getMaxClaims(): Promise<bigint> {
    return await publicClient.readContract({
        address: process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS as `0x${string}`,
        abi: MAX_CLAIMS_ABI,
        functionName: 'maxClaimsPerCycle',
    });
}


function getUrlHost(request: NextRequest): string {
    const origin = request.headers.get("origin");
    if (origin) { try { return new URL(origin).host; } catch (e) { console.warn("Invalid origin:", e); } }
    const host = request.headers.get("host");
    if (host) { return host; }
    const vercelUrl = process.env.VERCEL_URL;
    const urlValue = process.env.VERCEL_ENV === "production" ? process.env.NEXT_PUBLIC_URL! : vercelUrl ? `https://vercelUrl}` : "http://localhost:3000";
    return new URL(urlValue).host;
}

// =================================================================================
//                                 API POST HANDLER
// =================================================================================

export async function POST(req: NextRequest) {
  console.log("\n\n--- [API] Received POST request to /api/claim/signature ---");
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Missing token" }, { status: 401 });
    }
    const payload = await client.verifyJwt({
        token: authorization.split(" ")[1] as string,
        domain: getUrlHost(req),
    });
    const userFid = BigInt(payload.sub);
    console.log(`[API LOG] ✅ JWT Verified. Request from FID: ${userFid}`);

    if (!prisma) {
      throw new Error("Database client is not available");
    }

    // [SECURITY CRITICAL] The `amount` is no longer accepted from the client.
    // Instead, we fetch the server-validated score from the latest completed game session.
    const user = await prisma.user.findUnique({
      where: { fid: userFid },
      include: {
        gameSessions: {
          where: { status: 'COMPLETED' },
          orderBy: { endTime: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // [SECURITY FIX] Ensure the user is fully registered and active before proceeding.
    if (user.registrationStatus !== 'ACTIVE') {
      return NextResponse.json({ message: 'User is not authorized to claim.' }, { status: 403 });
    }

    const latestSession = user.gameSessions[0];
    if (!latestSession || !latestSession.score) {
      return NextResponse.json({ message: 'No completed game session found to claim' }, { status: 400 });
    }
    
    const amount = latestSession.score;
    
    // Invalidate the session so it cannot be claimed again
    await prisma.gameSession.update({
        where: { id: latestSession.id },
        data: { status: 'CLAIMED' }
    });

    // [CORRECTED] Step 1: Fetch the user's full on-chain profile in one call
    const onChainProfile = await getOnChainProfile(userFid);

    // [CORRECTED] Step 2: Perform server-side pre-flight checks using the full profile data
    if (!onChainProfile.isRegistered) {
        return NextResponse.json({ message: "User is not registered on-chain." }, { status: 403 });
    }
    
    const maxClaims = await getMaxClaims();
    const cooldownPeriod = BigInt(12 * 60 * 60); // 24 hours in seconds

    // Check if the user is currently on cooldown
    if (onChainProfile.claimsInCurrentCycle >= maxClaims) {
        const now = BigInt(Math.floor(Date.now() / 1000));
        const cooldownEndTime = onChainProfile.lastClaimTimestamp + cooldownPeriod;
        if (now < cooldownEndTime) {
            return NextResponse.json({ 
                message: 'Your 12 hour claim cooldown has not passed yet.',
                resetsAt: new Date(Number(cooldownEndTime) * 1000).toISOString()
            }, { status: 429 }); // 429 Too Many Requests
        }
    }

    // 3. Prepare for Signing
    const serverAccount = privateKeyToAccount(process.env.SERVER_SIGNER_PRIVATE_KEY as `0x${string}`);
    const contractAddress = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS as `0x${string}`;
    const amountToClaim = parseEther(amount.toString());
    const nonce = onChainProfile.claimNonce; // Use the nonce from the profile we fetched

    console.log("\n--- [API DEBUG] Data for Claim Signature Generation ---");
    console.log(`   - Contract Address:      ${contractAddress}`);
    console.log(`   - User FID:              ${userFid.toString()}`);
    console.log(`   - Amount (in wei):       ${amountToClaim.toString()}`);
    console.log(`   - Nonce (from profile):  ${nonce.toString()}`);
    console.log(`   - Server Signer Address: ${serverAccount.address}`);
    console.log("---------------------------------------------------\n");

    // 4. Generate Signature
    const claimHash = keccak256(
      encodePacked(
        ['address', 'string', 'uint256', 'uint256', 'uint256'],
        [contractAddress, "CLAIM", userFid, amountToClaim, nonce]
      )
    );
    console.log(`[API LOG]  hashing... Generated Claim Hash: ${claimHash}`);

    const signature = await serverAccount.signMessage({ 
      message: { raw: claimHash } 
    });
    console.log(`[API LOG] ✅ signing... Generated Signature: ${signature}`);

    // 5. Return the signature and nonce to the frontend
    return NextResponse.json({ signature, nonce: nonce.toString() }, { status: 200 });

  } catch (error) {
    if (error instanceof Errors.InvalidTokenError) {
        return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    console.error("[API CRITICAL ERROR] An unexpected error occurred:", error);
    return NextResponse.json({ message: 'Server error, try again' }, { status: 500 });
  }
}