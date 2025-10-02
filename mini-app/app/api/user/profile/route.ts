import { convertBigIntsToStrings } from '../../../../lib/json';
import prisma from '../../../../lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, Hash } from 'viem';
import { baseSepolia, base } from 'viem/chains';
import { Errors, createClient } from "@farcaster/quick-auth";

// --- VIEM Public Client Setup ---
/* const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
}); */

const publicClient = createPublicClient({
  chain: base,
  transport: http("https://mainnet-preconf.base.org"),
});

/* function makeUserSerializable(user: any) {
  const serializableUser = { ...user };
  for (const key in serializableUser) {
    if (typeof serializableUser[key] === 'bigint') {
      serializableUser[key] = serializableUser[key].toString();
    } else if (serializableUser[key] instanceof require('decimal.js')) {
      serializableUser[key] = serializableUser[key].toString();
    }
  }
  return serializableUser;
} */

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate();
}

async function waitForTransactionConfirmation(hash: string, maxRetries = 10, delay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Attempting to get transaction receipt (attempt ${i + 1}/${maxRetries})...`);
      const receipt = await publicClient.getTransactionReceipt({ hash: hash as Hash });
      console.log('Transaction receipt found:', receipt);
      return receipt;
    } catch (error: any) {
      if (error.message?.includes('Transaction receipt not found') ||
        error.message?.includes('could not be found')) {
        console.log(`Transaction not yet confirmed, waiting ${delay}ms before retry...`);
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      throw error;
    }
  }
  throw new Error('Transaction confirmation timeout');
}

async function fetchFarcasterProfile(fid: string | number) {
  const neynarApiKey = process.env.NEYNAR_API_KEY;
  if (!neynarApiKey) {
    throw new Error("NEYNAR_API_KEY environment variable is not set.");
  }


  const url = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api_key': neynarApiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Neynar API failed with status ${response.status}: ${errorData.message}`);
    }

    const data = await response.json();

    if (!data.users || data.users.length === 0) {
      throw new Error(`Farcaster user with FID ${fid} not found.`);
    }

    const userProfile = data.users[0];
    return {
      username: userProfile.username,
      pfpUrl: userProfile.pfp_url,
    };
  } catch (error) {
    console.error("Error fetching Farcaster profile:", error);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fid = searchParams.get('fid');

  if (!fid) {
    return NextResponse.json({ message: 'Farcaster ID (fid) is required' }, { status: 400 });
  }

  try {
    let user = await prisma.user.findUnique({
      where: { fid: BigInt(fid) },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    const userId = user.id;

    const allUsers = await prisma.user.findMany({
      orderBy: {
        weeklyPoints: 'desc',
      },
    });

    const userRank = allUsers.findIndex((u) => u.id === userId) + 1;

    // Lazily reset streak if a day was missed
    if (user.streak > 0 && user.lastClaimedAt) {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setUTCDate(now.getUTCDate() - 1);

      const lastClaimWasToday = isSameDay(user.lastClaimedAt, now);
      const lastClaimWasYesterday = isSameDay(user.lastClaimedAt, yesterday);

      if (!lastClaimWasToday && !lastClaimWasYesterday) {
        console.log(`User ${user.username}'s streak broken. Last claim: ${user.lastClaimedAt}. Resetting to 0.`);
        user = await prisma.user.update({
          where: { id: userId },
          data: { streak: 0 },
        });
      }
    }

    // NEW: Adjust claimsToday for display purposes if the window has expired
    const now = new Date();
    if (!user.claimWindowStart || now.getTime() - user.claimWindowStart.getTime() > 24 * 60 * 60 * 1000) {
        user.claimsToday = 0;
    }

    const userProfile = convertBigIntsToStrings(user);
    (userProfile as any).weeklyRank = userRank;

    return NextResponse.json(userProfile, { status: 200 });

  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ message: 'Error fetching user' }, { status: 500 });
  }
}

const client = createClient();

function getUrlHost(request: NextRequest) {
    const origin = request.headers.get("origin");
    if (origin) {
      try {
        const url = new URL(origin);
        return url.host;
      } catch (error) {
        console.warn("Invalid origin header:", origin, error);
      }
    }
  
    // Fallback to Host header
    const host = request.headers.get("host");
    if (host) {
      return host;
    }
  
    // Final fallback to environment variables
    let urlValue: string;
    if (process.env.VERCEL_ENV === "production") {
      urlValue = process.env.NEXT_PUBLIC_URL!;
    } else if (process.env.VERCEL_URL) {
      urlValue = `https://${process.env.VERCEL_URL}`;
    } else {
      urlValue = "http://localhost:3000";
    }
  
    const url = new URL(urlValue);
    return url.host;
  }

export async function POST(req: NextRequest) {
  try {
    console.log('Starting POST /api/user/profile handler');
    const authorization = req.headers.get("Authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
        return NextResponse.json({ message: "Missing token" }, { status: 401 });
    }

    const payload = await client.verifyJwt({
        token: authorization.split(" ")[1] as string,
        domain: getUrlHost(req),
    });
    const authenticatedFid = payload.sub;

    const body = await req.json();
    const { fid, walletAddress } = body;
    console.log('Received registration request:', { fid, walletAddress });

    if (authenticatedFid !== fid) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!fid || !walletAddress) {
      return NextResponse.json({ message: 'Farcaster ID (fid) and wallet address are required' }, { status: 400 });
    }

    const userFid = BigInt(fid);

    const existingUser = await prisma.user.findUnique({ where: { fid: userFid } });
    if (existingUser) {
      console.log('User already exists:', existingUser);

     const serializableExistingUser = convertBigIntsToStrings(existingUser);
      return NextResponse.json(serializableExistingUser, { status: 200 });
    }

    console.log(`Fetching Farcaster profile for FID: ${fid}...`);
    const farcasterProfile = await fetchFarcasterProfile(fid);

    console.log('Attempting to create user in database with real Farcaster data:', {
      fid: userFid,
      walletAddress: walletAddress.toLowerCase(),
      username: farcasterProfile.username,
      pfpUrl: farcasterProfile.pfpUrl,
    });

    const newUser = await prisma.user.create({
      data: {
        fid: userFid,
        walletAddress: walletAddress.toLowerCase(),
        username: farcasterProfile.username,
        pfpUrl: farcasterProfile.pfpUrl,
      },
    });

    console.log('User created successfully:', newUser);
    const serializableNewUser = convertBigIntsToStrings(newUser);
    return NextResponse.json(serializableNewUser, { status: 201 });

  } catch (error) {
    if (error instanceof Errors.InvalidTokenError) {
        return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    console.error("Failed to create user:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  } finally {
    await prisma.$disconnect().catch(e => console.error('Error disconnecting from database:', e));
  }
}
