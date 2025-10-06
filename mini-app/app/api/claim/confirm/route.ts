// app/api/claim/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Errors, createClient } from "@farcaster/quick-auth";
import prisma from '@/lib/prisma';
import { createPublicClient, http, Hash } from 'viem';
import { base } from 'viem/chains';

const client = createClient();

function getUrlHost(request: NextRequest): string {
    const origin = request.headers.get("origin");
    if (origin) { try { return new URL(origin).host; } catch (e) { console.warn("Invalid origin:", e); } }
    const host = request.headers.get("host");
    if (host) { return host; }
    const vercelUrl = process.env.VERCEL_URL;
    const urlValue = process.env.VERCEL_ENV === "production" ? process.env.NEXT_PUBLIC_URL! : vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000";
    return new URL(urlValue).host;
}

const publicClient = createPublicClient({ chain: base, transport: http("https://mainnet-preconf.base.org") });

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
    const fid = BigInt(payload.sub); // Use BigInt for consistency with Prisma

    const { txHash, points } = await req.json();
    if (!txHash) { // The 'points' parameter is unused as per the logic, so its check can be removed.
      return NextResponse.json({ message: 'txHash is required' }, { status: 400 });
    }

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as Hash, timeout: 60_000 });

    if (receipt.status !== 'success') {
      throw new Error('Transaction failed on-chain.');
    }

    const receiptToAddress = receipt.to?.toLowerCase();
    const contractAddress = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS?.toLowerCase();

    console.log("Verifying transaction addresses:");
    console.log("Receipt 'to' address:", receiptToAddress);
    console.log("Expected contract address from env:", contractAddress);

    if (receiptToAddress !== contractAddress) {
      throw new Error('Transaction was not sent to the game contract.');
    }

    // Idempotency check: Ensure this transaction hasn't been processed
    const existingClaim = await prisma.claim.findUnique({
      where: { txHash: txHash as string },
    });

    if (existingClaim) {
      // It's not an error if it's already processed, just a successful duplicate call.
      return NextResponse.json({ message: 'Transaction already processed' }, { status: 200 });
    }

    const user = await prisma.user.findUnique({ where: { fid } });
    if (!user) {
      throw new Error('User not found in our database');
    }
    
    // [THE CRITICAL FIX]
    // Check if the sender of the transaction is one of the user's verified wallets.
    const senderWallet = receipt.from.toLowerCase();
    const isWalletVerified = user.verifiedWallets.includes(senderWallet);

    if (!isWalletVerified) {
      // This provides a much clearer error message
      return NextResponse.json({ message: `Transaction was sent from a wallet (${senderWallet}) that is not verified for this Farcaster account.` }, { status: 400 });
    }
    
    // The comment below is key: your indexer will handle the database updates.
    // This endpoint's only remaining job is to confirm the transaction's validity.
    // If you wanted to, you could create the `Claim` record here as the final step.
    // Example: await prisma.claim.create({ data: { txHash, userId: user.id } });

    return NextResponse.json({ message: 'Claim transaction confirmed successfully' }, { status: 200 });

  } catch (error) {
    if (error instanceof Errors.InvalidTokenError) {
        return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    console.error("Error confirming claim:", error);
    // Return a generic error message to the user
    return NextResponse.json({ message: 'Server error, try again' }, { status: 500 });
  }
}