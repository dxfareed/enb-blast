import prisma from '../../../../lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

function makeUserSerializable(user: any) {
  return {
    ...user,
    fid: user.fid.toString(),
  };
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
    const body = await req.json();
    const { fid } = body;

    if (!fid) {
      return NextResponse.json({ message: 'Farcaster ID (fid) is required' }, { status: 400 });
    }
    
    const userFid = BigInt(fid);

    const existingUser = await prisma.user.findUnique({ where: { fid: userFid } });
    if (existingUser) {
      const serializableUser = makeUserSerializable(existingUser);
      return NextResponse.json(serializableUser, { status: 200 });
    }

    const neynarApiKey = process.env.NEYNAR_API_KEY;
    if (!neynarApiKey) throw new Error("NEYNAR_API_KEY not set");

    const neynarUrl = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`;
    
    const response = await fetch(neynarUrl, {
      method: 'GET',
      headers: { 'accept': 'application/json', 'api_key': neynarApiKey },
    });

    if (!response.ok) throw new Error(`Neynar API failed: ${response.status}`);

    const neynarData = await response.json();
    const farcasterUser = neynarData.users[0];

    if (!farcasterUser) {
      return NextResponse.json({ message: `Farcaster user not found for FID: ${fid}` }, { status: 404 });
    }

    let walletAddress = null;

    if (farcasterUser.verified_addresses?.primary?.eth_address) {
        walletAddress = farcasterUser.verified_addresses.primary.eth_address;
    }
    else if (farcasterUser.verified_addresses?.eth_addresses?.length > 0) {
        walletAddress = farcasterUser.verified_addresses.eth_addresses[0];
    }
  

    if (!walletAddress) {
      return NextResponse.json({ message: `User with FID ${fid} has no verified ETH wallet address.` }, { status: 400 });
    }

    const newUser = await prisma.user.create({
      data: {
        fid: userFid,
        walletAddress: walletAddress.toLowerCase(),
        username: farcasterUser.username,
        pfpUrl: farcasterUser.pfp_url,
      },
    });
    
    const serializableUser = makeUserSerializable(newUser);
    return NextResponse.json(serializableUser, { status: 201 });

  } catch (error) {
    console.error("Failed to create user:", error);
    return NextResponse.json({ message: 'Error creating user' }, { status: 500 });
  }
}