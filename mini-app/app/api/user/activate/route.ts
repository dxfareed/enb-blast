import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createPublicClient, http, Hash } from 'viem';
import { base } from 'viem/chains';
import { Errors, createClient } from "@farcaster/quick-auth";

const publicClient = createPublicClient({ chain: base, transport: http() });
const client = createClient();

function getUrlHost(request: NextRequest) {
    const origin = request.headers.get("origin");
    if (origin) { try { return new URL(origin).host; } catch (e) { console.warn("Invalid origin:", e); } }
    const host = request.headers.get("host");
    if (host) { return host; }
    const vercelUrl = process.env.VERCEL_URL;
    const urlValue = process.env.VERCEL_ENV === "production" ? process.env.NEXT_PUBLIC_URL! : vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000";
    return new URL(urlValue).host;
}

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
    const fid = payload.sub;

    const { txHash } = await req.json();
    if (!txHash) {
      return NextResponse.json({ message: 'txHash is required' }, { status: 400 });
    }

    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as Hash });

    if (receipt.status !== 'success') {
      throw new Error('Transaction failed.');
    }
    if (receipt.to?.toLowerCase() !== process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS?.toLowerCase()) {
      throw new Error('Transaction was not sent to the game contract.');
    }

    const user = await prisma.user.findUnique({ where: { fid } });
    if (!user) {
      throw new Error('User not found');
    }
    if (receipt.from.toLowerCase() !== user.walletAddress.toLowerCase()){
      throw new Error('Transaction was sent from an incorrect wallet.');
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        registrationStatus: 'ACTIVE',
      },
    });

    return NextResponse.json({ message: 'User activated successfully' }, { status: 200 });

  } catch (error) {
    if (error instanceof Errors.InvalidTokenError) {
        return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    console.error("Error activating user:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error activating user: ${errorMessage}` }, { status: 500 });
  }
}
