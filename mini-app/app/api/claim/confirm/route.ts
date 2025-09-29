import { NextRequest, NextResponse } from 'next/server';
import { Errors, createClient } from "@farcaster/quick-auth";
import prisma from '@/lib/prisma';
import { createPublicClient, http, Hash } from 'viem';
import { base } from 'viem/chains';

function isSameDay(date1: Date, date2: Date): boolean {
  if (!date1 || !date2) return false;
  return date1.getUTCFullYear() === date2.getUTCFullYear() &&
         date1.getUTCMonth() === date2.getUTCMonth() &&
         date1.getUTCDate() === date2.getUTCDate();
}

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

const publicClient = createPublicClient({ chain: base, transport: http() });

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

    const { txHash, points } = await req.json();
    if (!txHash || points === undefined) {
      return NextResponse.json({ message: 'txHash and points are required' }, { status: 400 });
    }

    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as Hash });

    if (receipt.status !== 'success') {
      throw new Error('Transaction failed on-chain.');
    }
    if (receipt.to?.toLowerCase() !== process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS?.toLowerCase()) {
      throw new Error('Transaction was not sent to the game contract.');
    }

    const user = await prisma.user.findUnique({ where: { fid } });
    if (!user) throw new Error('User not found');
    if (receipt.from.toLowerCase() !== user.walletAddress.toLowerCase()){
      throw new Error('Transaction was sent from an incorrect wallet.');
    }
    
    const now = new Date();
    let newStreak = 1; // Default to 1 for a new streak

    if (user.lastClaimedAt) {
        if (isSameDay(user.lastClaimedAt, now)) {
            newStreak = user.streak; // Same day, no change
        } else {
            const yesterday = new Date(now);
            yesterday.setUTCDate(yesterday.getUTCDate() - 1);
            if (isSameDay(user.lastClaimedAt, yesterday)) {
                newStreak = user.streak + 1; // Consecutive day
            }
            // If it's not the same day and not yesterday, it defaults to 1 (streak reset)
        }
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            totalPoints: { increment: points },
            weeklyPoints: { increment: points },
            streak: newStreak,
            lastClaimedAt: now,
        },
    });

    return NextResponse.json({ message: 'Claim confirmed successfully' }, { status: 200 });

  } catch (error) {
    if (error instanceof Errors.InvalidTokenError) {
        return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    console.error("Error confirming claim:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error confirming claim: ${errorMessage}` }, { status: 500 });
  }
}
