import { NextRequest, NextResponse } from 'next/server';
import { createClient, Errors } from "@farcaster/quick-auth";
import prisma from '@/lib/prisma';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { createPublicClient, http, keccak256, encodePacked } from 'viem';
import { POWERUP_CONTRACT_ADDRESS, POWERUP_CONTRACT_ABI } from '@/app/utils/constants';

const client = createClient();

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

function getUrlHost(request: NextRequest): string {
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
    const fid = BigInt(payload.sub);

    const user = await prisma.user.findUnique({ where: { fid } });
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const nonce = await publicClient.readContract({
        address: POWERUP_CONTRACT_ADDRESS,
        abi: POWERUP_CONTRACT_ABI,
        functionName: 'powerUpNonce',
        args: [fid],
    });

    const privateKey = process.env.SERVER_SIGNER_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("SERVER_SIGNER_PRIVATE_KEY is not set");
    }
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    const messageHash = keccak256(
        encodePacked(
            ['address', 'string', 'uint256', 'uint256'],
            [POWERUP_CONTRACT_ADDRESS, "ACTIVATE_POWERUP", fid, nonce]
        )
    );
    
    const signature = await account.signMessage({
        message: { raw: messageHash },
    });

    const depositAmount = await publicClient.readContract({
        address: POWERUP_CONTRACT_ADDRESS,
        abi: POWERUP_CONTRACT_ABI,
        functionName: 'powerUpDepositAmount',
    });

    return NextResponse.json({ signature, nonce: nonce.toString(), depositAmount: depositAmount.toString() }, { status: 200 });

  } catch (error) {
    if (error instanceof Errors.InvalidTokenError) {
        return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    console.error('Failed to get power-up signature:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
