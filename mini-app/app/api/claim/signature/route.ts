import { ethers } from 'ethers';
import { NextRequest, NextResponse } from 'next/server';
import { Errors, createClient } from "@farcaster/quick-auth";
import prisma from '@/lib/prisma';

const GAME_CONTRACT_ABI = [
  "function userNonces(address owner) view returns (uint256)"
];


async function getCurrentNonce(walletAddress: string): Promise<bigint> {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const contract = new ethers.Contract(
    process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS!,
    GAME_CONTRACT_ABI,
    provider
  );
  return await contract.userNonces(walletAddress);
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

    const { walletAddress, amount } = await req.json();
    if (!walletAddress || amount === undefined) {
      return NextResponse.json({ message: 'walletAddress and amount are required' }, { status: 400 });
    }





    const serverWallet = new ethers.Wallet(process.env.SERVER_SIGNER_PRIVATE_KEY!);
    const contractAddress = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS!;
    const amountToClaim = ethers.parseUnits(amount.toString(), 18);
    const nonce = await getCurrentNonce(walletAddress);

    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'address', 'uint256', 'uint256'],
      [contractAddress, walletAddress, amountToClaim, nonce]
    );

    const signature = await serverWallet.signMessage(ethers.toBeArray(messageHash));
    return NextResponse.json({ signature }, { status: 200 });

  } catch (error) {
    if (error instanceof Errors.InvalidTokenError) {
        return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    console.error("Error generating signature:", error);
    return NextResponse.json({ message: 'Try again' }, { status: 500 });
  }
}