import { ethers } from 'ethers';
import { NextRequest, NextResponse } from 'next/server';
import { Errors, createClient } from "@farcaster/quick-auth";
import prisma from '@/lib/prisma';

const GAME_CONTRACT_ABI = [
  "function userNonces(address owner) view returns (uint256)"
];

// --- Helper Functions ---
function isSameDay(date1: Date, date2: Date): boolean {
  if (!date1 || !date2) return false;
  return date1.getUTCFullYear() === date2.getUTCFullYear() &&
         date1.getUTCMonth() === date2.getUTCMonth() &&
         date1.getUTCDate() === date2.getUTCDate();
}

async function getCurrentNonce(walletAddress: string): Promise<bigint> {
  const provider = new ethers.JsonRpcProvider(process.env.TESTNET_RPC_URL);
  const contract = new ethers.Contract(
    process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS!,
    GAME_CONTRACT_ABI,
    provider
  );
  return await contract.userNonces(walletAddress);
}

const client = createClient({
  fetch: (url, options) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    return fetch(url, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(timeout));
  }
});

function getUrlHost(request: NextRequest) {
    const origin = request.headers.get("origin");
    if (origin) { try { return new URL(origin).host; } catch (e) { console.warn("Invalid origin:", e); } }
    const host = request.headers.get("host");
    if (host) { return host; }
    const vercelUrl = process.env.VERCEL_URL;
    const urlValue = process.env.VERCEL_ENV === "production" ? process.env.NEXT_PUBLIC_URL! : vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000";
    return new URL(urlValue).host;
}

// --- API Handler ---
export async function POST(req: NextRequest) {
  console.log(`--- GENERATE-SIGNATURE HIT AT ${new Date().toISOString()} ---`);
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

    const body = await req.json();
    const { walletAddress, amount, points } = body;

    if (!walletAddress || !amount || points === undefined) {
      return NextResponse.json({ message: 'walletAddress, amount, and points are required' }, { status: 400 });
    }
    if (typeof amount !== 'number' || amount <= 0 || typeof points !== 'number' || points < 0) {
        return NextResponse.json({ message: 'Amount must be a positive number and points must be non-negative.' }, { status: 400 });
    }

    const signature = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { fid } });

      if (!user || !user.walletAddress || user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          throw new Error('Invalid wallet address');
      }

      const now = new Date();
      const isFirstClaimToday = !user.lastClaimedAt || !isSameDay(user.lastClaimedAt, now);
      let newStreak = user.streak;

      if (isFirstClaimToday) {
        const yesterday = new Date(now);
        yesterday.setUTCDate(now.getUTCDate() - 1);

        if (user.lastClaimedAt && isSameDay(user.lastClaimedAt, yesterday)) {
          newStreak++; // Continue streak
        } else {
          newStreak = 1; // Start or reset streak
        }
      }
      // If it's not the first claim today, the streak remains unchanged.

      await tx.user.update({
        where: { id: user.id },
        data: {
          totalPoints: { increment: points },
          weeklyPoints: { increment: points },
          streak: newStreak,
          lastClaimedAt: now, // Always update the timestamp
        },
      });

      const serverWallet = new ethers.Wallet(process.env.SERVER_SIGNER_PRIVATE_KEY!);
      const contractAddress = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS!;
      const amountToClaim = ethers.parseUnits(amount.toString(), 18);
      const nonce = await getCurrentNonce(walletAddress);

      const messageHash = ethers.solidityPackedKeccak256(
        ['address', 'address', 'uint256', 'uint256'],
        [contractAddress, walletAddress, amountToClaim, nonce]
      );

      return await serverWallet.signMessage(ethers.toBeArray(messageHash));
    });

    return NextResponse.json({ signature }, { status: 200 });

  } catch (error) {
    if (error instanceof Errors.InvalidTokenError) {
        return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    if (error.message === 'Invalid wallet address') {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error generating signature:", error);
    return NextResponse.json({ message: 'Error generating signature' }, { status: 500 });
  }
}