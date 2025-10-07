// app/api/user/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  createPublicClient, 
  http, 
  Hash, 
  keccak256, 
  encodePacked, 
  encodeAbiParameters 
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { Errors, createClient } from "@farcaster/quick-auth";
import { convertBigIntsToStrings } from '../../../../lib/json';
import prisma from '../../../../lib/prisma';

// =================================================================================
//                                  CONFIGURATION
// =================================================================================

// Viem public client for read-only blockchain interactions
const publicClient = createPublicClient({
  chain: base,
  transport: http("https://mainnet-preconf.base.org"),
});

// The ABI for the functions we need to call, formatted for viem
const GAME_CONTRACT_ABI = [{
  "inputs": [{ "internalType": "uint256", "name": "fid", "type": "uint256" }],
  "name": "userProfiles",
  "outputs": [{ "internalType": "bool", "name": "isRegistered", "type": "bool" }],
  "stateMutability": "view",
  "type": "function"
}] as const; // Using 'as const' provides strong typing

// Farcaster Auth Client
const client = createClient();

// =================================================================================
//                                HELPER FUNCTIONS
// =================================================================================

async function fetchFarcasterProfile(fid: bigint | string) {
  const neynarApiKey = process.env.NEYNAR_API_KEY;
  if (!neynarApiKey) {
    throw new Error("NEYNAR_API_KEY environment variable is not set.");
  }

  const url = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'accept': 'application/json', 'api_key': neynarApiKey },
  });

  if (!response.ok) {
    throw new Error(`Neynar API failed with status ${response.status}`);
  }
  
  const data = await response.json();
  if (!data.users || data.users.length === 0) {
    throw new Error(`Farcaster user with FID ${fid} not found via Neynar.`);
  }
  
  const user = data.users[0];
  return {
    username: user.username,
    pfpUrl: user.pfp_url,
    wallets: user.verified_addresses?.eth_addresses || []
  };
}

// [REFACTORED WITH VIEM]
async function isFidAlreadyRegistered(fid: bigint): Promise<boolean> {
  const data = await publicClient.readContract({
    address: process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS as `0x${string}`,
    abi: GAME_CONTRACT_ABI,
    functionName: 'userProfiles',
    args: [fid]
  });
  // The result of readContract is the boolean value directly
  return data;
}

function getUrlHost(request: NextRequest): string {
    const origin = request.headers.get("origin");
    if (origin) { try { return new URL(origin).host; } catch (e) { console.warn("Invalid origin:", e); } }
    const host = request.headers.get("host");
    if (host) { return host; }
    const vercelUrl = process.env.VERCEL_URL;
    const urlValue = process.env.VERCEL_ENV === "production" ? process.env.NEXT_PUBLIC_URL! : vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000";
    return new URL(urlValue).host;
}

function isSameDay(date1: Date, date2: Date): boolean {
    return date1.getUTCFullYear() === date2.getUTCFullYear() &&
           date1.getUTCMonth() === date2.getUTCMonth() &&
           date1.getUTCDate() === date2.getUTCDate();
}


// =================================================================================
//                           API GET HANDLER (Fetch Profile)
// =================================================================================

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fid = searchParams.get('fid');
  if (!fid) {
    return NextResponse.json({ message: 'Farcaster ID (fid) is required' }, { status: 400 });
  }

  try {
    let user = await prisma.user.findUnique({ where: { fid: BigInt(fid) } });
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setUTCDate(now.getUTCDate() - 1);
    if (user.streak > 0 && user.lastClaimedAt && !isSameDay(user.lastClaimedAt, now) && !isSameDay(user.lastClaimedAt, yesterday)) {
      user = await prisma.user.update({ where: { id: user.id }, data: { streak: 0 } });
    }

    const allUsers = await prisma.user.findMany({ orderBy: { weeklyPoints: 'desc' } });
    const userRank = allUsers.findIndex((u) => u.id === user.id) + 1;
    
    const serializableUser = convertBigIntsToStrings(user);
    const finalUserProfile = {
        ...serializableUser,
        fid: parseInt(serializableUser.fid, 10),
        weeklyRank: userRank
    };

    return NextResponse.json(finalUserProfile, { status: 200 });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ message: 'Error fetching user' }, { status: 500 });
  }
}

// =================================================================================
//                    API POST HANDLER (Create Profile & Get Signature)
// =================================================================================

export async function POST(req: NextRequest) {
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
    const { walletAddress } = await req.json();
    if (!walletAddress) {
      return NextResponse.json({ message: 'walletAddress is required' }, { status: 400 });
    }

    let user = await prisma.user.findUnique({ where: { fid: userFid } });
    if (!user) {
      const farcasterProfile = await fetchFarcasterProfile(userFid);
      user = await prisma.user.create({
        data: {
          fid: userFid,
          walletAddress: walletAddress.toLowerCase(),
          username: farcasterProfile.username,
          pfpUrl: farcasterProfile.pfpUrl,
          registrationStatus: 'PENDING',
          verifiedWallets: farcasterProfile.wallets.map((w:any) => w.toLowerCase()),
        },
      });
    }
    
    const serializableUser = convertBigIntsToStrings(user);
    const finalUserProfile = {
        ...serializableUser,
        fid: parseInt(serializableUser.fid, 10)
    };

    if (await isFidAlreadyRegistered(userFid)) {
      if (user.registrationStatus !== 'ACTIVE') {
        await prisma.user.update({ where: { fid: userFid }, data: { registrationStatus: 'ACTIVE' } });
        finalUserProfile.registrationStatus = 'ACTIVE';
      }
      return NextResponse.json({ ...finalUserProfile, signature: null }, { status: 200 });
    }

    const farcasterProfile = await fetchFarcasterProfile(userFid);
    const wallets = farcasterProfile.wallets;
    if (wallets.length === 0) {
      return NextResponse.json({ message: "No verified Ethereum addresses found on your Farcaster account." }, { status: 404 });
    }

    // [REFACTORED WITH VIEM]
    const serverAccount = privateKeyToAccount(process.env.SERVER_SIGNER_PRIVATE_KEY as `0x${string}`);
    const contractAddress = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS as `0x${string}`;
    
    // Create the inner hash of the wallets array
    const encodedWallets = encodeAbiParameters([{ type: 'address[]' }], [wallets]);
    const walletsHash = keccak256(encodedWallets);

    // Create the final registration hash
    const registrationHash = keccak256(
      encodePacked(
        ['address', 'string', 'uint256', 'bytes32'],
        [contractAddress, "REGISTER", userFid, walletsHash]
      )
    );

    // Sign the hash
    const signature = await serverAccount.signMessage({ 
      message: { raw: registrationHash } 
    });

    return NextResponse.json({
      ...finalUserProfile,
      signature,
      wallets
    }, { status: 200 });

  } catch (error) {
    if (error instanceof Errors.InvalidTokenError) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    console.error("[API CRITICAL ERROR]", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Server Timeout, try again', error: errorMessage }, { status: 500 });
  }
}