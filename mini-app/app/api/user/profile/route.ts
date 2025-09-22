import prisma from '../../../../lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, Hash } from 'viem';
import { baseSepolia, base } from 'viem/chains';

// --- VIEM Public Client Setup ---
/* const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
}); */

const publicClient = createPublicClient({
  chain: base,
  transport: http("https://mainnet-preconf.base.org"),
});

function makeUserSerializable(user: any) {
  return {
    ...user,
    fid: user.fid.toString(),
  };
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
    const user = await prisma.user.findUnique({ where: { fid: BigInt(fid) } });
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    const serializableUser = makeUserSerializable(user);
    return NextResponse.json(serializableUser, { status: 200 });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ message: 'Error fetching user' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('Starting POST /api/user/profile handler');
    
    const body = await req.json();
    const { fid, hash, walletAddress } = body;
    console.log('Received registration request:', { fid, hash, walletAddress });

    if (!fid || !hash || !walletAddress) {
      return NextResponse.json({ message: 'Farcaster ID (fid), transaction hash, and wallet address are required' }, { status: 400 });
    }
    
    const userFid = BigInt(fid);

    const existingUser = await prisma.user.findUnique({ where: { fid: userFid } });
    if (existingUser) {
      console.log('User already exists:', existingUser);
      return NextResponse.json(makeUserSerializable(existingUser), { status: 200 });
    }

    console.log('Waiting for transaction confirmation:', hash);
    const txReceipt = await waitForTransactionConfirmation(hash);

    if (txReceipt.status !== 'success') {
      return NextResponse.json({ message: 'Transaction failed or is not yet confirmed.' }, { status: 400 });
    }

    const block = await publicClient.getBlock({ blockNumber: txReceipt.blockNumber });
    const transactionTime = Number(block.timestamp);
    if (Date.now() / 1000 - transactionTime > (30 * 60)) { // 30 minutes
      return NextResponse.json({ message: 'Transaction is too old. Please try again.' }, { status: 400 });
    }
    
    const gameContractAddress = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS?.toLowerCase();
    if (txReceipt.to?.toLowerCase() !== gameContractAddress) {
      return NextResponse.json({ message: 'Transaction was not sent to the correct game contract.' }, { status: 400 });
    }

    console.log(`Transaction verified. Fetching Farcaster profile for FID: ${fid}...`);
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
    return NextResponse.json(makeUserSerializable(newUser), { status: 201 });

  } catch (error) {
    console.error("Failed to create user:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  } finally {
    await prisma.$disconnect().catch(e => console.error('Error disconnecting from database:', e));
  }
}