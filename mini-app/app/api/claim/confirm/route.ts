// app/api/claim/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Errors, createClient } from "@farcaster/quick-auth";
import prisma from '@/lib/prisma';
import { createPublicClient, http, Hash, decodeEventLog } from 'viem';
import { base } from 'viem/chains';
import { GAME_CONTRACT_ABI } from '@/app/utils/constants';

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

    // --- START OF LOGGING ---
    console.log("--- Full Transaction Receipt ---");
    console.log(JSON.stringify(receipt, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value, 2
    ));
    console.log("---------------------------------");

    try {
      // Find the specific log entry for the TokensClaimed event
      const claimLogEntry = receipt.logs.find(log => {
        try {
          const decoded = decodeEventLog({ abi: GAME_CONTRACT_ABI, ...log });
          return decoded.eventName === 'TokensClaimed';
        } catch {
          return false;
        }
      });

      if (claimLogEntry) {
        // Decode the found log to get the arguments
        const decodedLog = decodeEventLog({ abi: GAME_CONTRACT_ABI, ...claimLogEntry });

        console.log("--- Decoded TokensClaimed Event ---");
        console.log(JSON.stringify(decodedLog, (key, value) => 
            typeof value === 'bigint' ? value.toString() : value, 2
        ));
        console.log("------------------------------------");

        // --- Additional Verification Logging ---
        const eventContractAddress = claimLogEntry.address?.toLowerCase();
        const expectedContractAddress = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS?.toLowerCase();
        const walletFromEvent = (decodedLog.args as { claimingWallet?: `0x${string}` }).claimingWallet?.toLowerCase();
        const senderFromReceipt = receipt.from.toLowerCase();

        console.log("--- Event & Receipt Address Verification ---");
        console.log(`Event emitted by: ${eventContractAddress}`);
        console.log(`Expected contract:  ${expectedContractAddress}`);
        console.log(`Wallet from event:  ${walletFromEvent}`);
        console.log(`Sender from receipt:${senderFromReceipt}`);
        console.log(`Event contract matches expected? ${eventContractAddress === expectedContractAddress}`);
        console.log(`Event wallet matches receipt sender? ${walletFromEvent === senderFromReceipt}`);
        console.log("------------------------------------------");
        // --- End of Additional Verification ---

      } else {
        console.log("!!! TokensClaimed event not found in transaction logs. !!!");
      }
    } catch (e) {
      console.error("!!! Error decoding event logs: !!!", e);
    }
    // --- END OF LOGGING ---

    // --- Event-Driven Validation ---

    // 1. Find and decode the TokensClaimed event from the transaction logs.
    const claimLogEntry = receipt.logs.find(log => {
      try {
        const decoded = decodeEventLog({ abi: GAME_CONTRACT_ABI, ...log });
        return decoded.eventName === 'TokensClaimed' && log.address.toLowerCase() === process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS?.toLowerCase();
      } catch {
        return false;
      }
    });

    if (!claimLogEntry) {
      throw new Error('Valid "TokensClaimed" event not found in transaction.');
    }
    const decodedLog = decodeEventLog({ abi: GAME_CONTRACT_ABI, ...claimLogEntry });
    const claimingWallet = (decodedLog.args as { claimingWallet?: `0x${string}` }).claimingWallet?.toLowerCase();

    if (!claimingWallet) {
        throw new Error('Could not decode the claiming wallet address from the event log.');
    }

    // 2. Idempotency Check: Ensure this transaction hasn't been processed.
    const existingClaim = await prisma.claim.findUnique({
      where: { txHash: txHash as string },
    });

    if (existingClaim) {
      return NextResponse.json({ message: 'Transaction already processed' }, { status: 200 });
    }

    // 3. User and Wallet Verification
    const user = await prisma.user.findUnique({ where: { fid } });
    if (!user) {
      throw new Error('User not found in our database');
    }
    
    const isWalletVerified = user.verifiedWallets.includes(claimingWallet) || user.walletAddress.toLowerCase() === claimingWallet;

    if (!isWalletVerified) {
      return NextResponse.json({ 
        message: `Transaction was initiated by a wallet (${claimingWallet}) that is not verified for this Farcaster account.` 
      }, { status: 400 });
    }
    
    // If all checks pass, the claim is valid.
    // The indexer will handle the database updates based on the event.
    // You could optionally create the Claim record here as well.
    // await prisma.claim.create({ data: { txHash, userId: user.id } });

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