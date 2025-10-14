// app/api/claim/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { Errors, createClient } from "@farcaster/quick-auth";

const publicClient = createPublicClient({ chain: base, transport: http() });

const GAME_CONTRACT_ABI = [
    {
        "inputs": [{ "internalType": "uint256", "name": "_fid", "type": "uint256" }],
        "name": "getUserProfile",
        "outputs": [{
            "components": [
                { "internalType": "bool", "name": "isRegistered", "type": "bool" },
                { "internalType": "uint256", "name": "registrationDate", "type": "uint256" },
                { "internalType": "uint256", "name": "lastClaimTimestamp", "type": "uint256" },
                { "internalType": "uint256", "name": "claimNonce", "type": "uint256" },
                { "internalType": "uint256", "name": "totalClaimed", "type": "uint256" },
                { "internalType": "uint256", "name": "claimsInCurrentCycle", "type": "uint256" }
            ], "internalType": "struct Game.UserProfileView", "name": "", "type": "tuple"
        }], "stateMutability": "view", "type": "function"
    },
    {
        "inputs": [],
        "name": "maxClaimsPerCycle",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

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


export async function GET(req: NextRequest) {
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

    const [onChainProfile, maxClaims] = await Promise.all([
        publicClient.readContract({
            address: process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS as `0x${string}`,
            abi: GAME_CONTRACT_ABI,
            functionName: 'getUserProfile',
            args: [userFid]
        }),
        publicClient.readContract({
            address: process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS as `0x${string}`,
            abi: GAME_CONTRACT_ABI,
            functionName: 'maxClaimsPerCycle',
        })
    ]);

    if (!onChainProfile.isRegistered) {
        return NextResponse.json({ message: "User not registered onchain" }, { status: 404 });
    }

    const cooldownPeriod = BigInt(12 * 60 * 60); // 12 hours in seconds
    const claimsMade = onChainProfile.claimsInCurrentCycle;
    
    let claimsLeft = Number(maxClaims) - Number(claimsMade);
    let isOnCooldown = false;
    let resetsAt: string | null = null;
    
    const now = BigInt(Math.floor(Date.now() / 1000));
    const cooldownEndTime = onChainProfile.lastClaimTimestamp + cooldownPeriod;

    // Scenario 1: User has used up all claims
    if (claimsMade >= maxClaims) {
        // Check if they are still within the cooldown period
        if (now < cooldownEndTime) {
            isOnCooldown = true;
            claimsLeft = 0;
            resetsAt = new Date(Number(cooldownEndTime) * 1000).toISOString();
        } else {
            // Cooldown has passed, so they get a full set of claims
            isOnCooldown = false;
            claimsLeft = Number(maxClaims);
            resetsAt = null;
        }
    }

    return NextResponse.json({
        claimsLeft: claimsLeft < 0 ? 0 : claimsLeft, // Ensure claimsLeft isn't negative
        isOnCooldown,
        resetsAt,
        maxClaims: Number(maxClaims)
    }, { status: 200 });

  } catch (error) {
    if (error instanceof Errors.InvalidTokenError) {
        return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    console.error("Error fetching claim status:", error);
    return NextResponse.json({ message: 'Server error, try again' }, { status: 500 });
  }
}