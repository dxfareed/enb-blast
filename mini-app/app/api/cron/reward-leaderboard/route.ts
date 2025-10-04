
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

const gameAbi = [
  'function sendReward(address _user, address[] calldata _recipients, uint256 _totalAmount)',
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (process.env.REWARD_USER !== 'true') {
    console.log('User rewarding is disabled.');
    return NextResponse.json({ success: false, message: 'User rewarding is disabled.' });
  }

  if (!process.env.REWARDER_PRIVATE_KEY) {
    console.error('REWARDER_PRIVATE_KEY is not set.');
    return NextResponse.json({ success: false, message: 'REWARDER_PRIVATE_KEY is not set.' }, { status: 500 });
  }

  try {
    const topUsers = await prisma.user.findMany({
      orderBy: {
        weeklyPoints: 'desc',
      },
      take: 10,
    });

    if (topUsers.length === 0) {
      console.log('No users found in the leaderboard.');
      return NextResponse.json({ success: true, message: 'No users to reward.' });
    }

    const provider = new ethers.WebSocketProvider(process.env.TESTNET_RPC_WSS_URL || "");
    const wallet = new ethers.Wallet(process.env.REWARDER_PRIVATE_KEY, provider);
    const gameContract = new ethers.Contract(process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS || "", gameAbi, wallet);

    const recipients = topUsers.map(user => user.walletAddress);
    const totalAmount = ethers.parseEther('10');

    const sender = "0xE59DF381684a7cf4D3E1177e68569b5D13F9585a";
    const tx = await gameContract.sendReward(sender, recipients, totalAmount);
    console.log(`Transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log('Transaction confirmed.');

    return NextResponse.json({ success: true, message: 'Rewards sent successfully.' });
  } catch (error) {
    console.error('Error sending rewards:', error);
    //@ts-ignore
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
