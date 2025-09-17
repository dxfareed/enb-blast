
import { ethers } from 'ethers';
import { NextRequest, NextResponse } from 'next/server';

const GAME_CONTRACT_ABI = [
  "function userNonces(address owner) view returns (uint256)"
];

async function getCurrentNonce(walletAddress: string): Promise<bigint> {
  const provider = new ethers.JsonRpcProvider(process.env.TESTNET_RPC_URL);

  const contract = new ethers.Contract(
    process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS!,
    GAME_CONTRACT_ABI,
    provider
  );

  return await contract.userNonces(walletAddress);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, amount } = body;

    if (!walletAddress || !amount) {
      return NextResponse.json({ message: 'walletAddress and amount are required' }, { status: 400 });
    }
    if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json({ message: 'Amount must be a positive number' }, { status: 400 });
    }

    const serverWallet = new ethers.Wallet(process.env.SERVER_SIGNER_PRIVATE_KEY!);

    const contractAddress = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS!;
    const amountToClaim = ethers.parseUnits(amount.toString(), 18); // Convert to the correct decimal format
    const nonce = await getCurrentNonce(walletAddress);

    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'address', 'uint256', 'uint256'],
      [contractAddress, walletAddress, amountToClaim, nonce]
    );

    const signature = await serverWallet.signMessage(ethers.toBeArray(messageHash));

    return NextResponse.json({ signature }, { status: 200 });

  } catch (error) {
    console.error("Error generating signature:", error);
    return NextResponse.json({ message: 'Error generating signature' }, { status: 500 });
  }
}