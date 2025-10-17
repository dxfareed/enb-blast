
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import { getWeek } from 'date-fns';
import { withRetry } from '../../../../lib/retry';

const prisma = new PrismaClient();

const gameAbi = [
  'function sendReward(address _user, address[] calldata _recipients, uint256 _totalAmount)',
];

// Helper to get the week ID for the *previous* week to ensure we reward the correct snapshot.
const getLastWeekId = (): string => {
  const now = new Date();
  // Go back 7 days to ensure we are safely in the previous week's snapshot period.
  const lastWeekDate = new Date(now.setDate(now.getDate() - 7));
  const year = lastWeekDate.getUTCFullYear();
  const week = getWeek(lastWeekDate, { weekStartsOn: 1 }); // Assuming week starts on Monday
  return `${year}-${week.toString().padStart(2, '0')}`;
};

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
    const weekId = getLastWeekId();
    console.log(`Fetching leaderboard history for week: ${weekId}`);

    const leaderboardSnapshot = await withRetry(() => 
      prisma.weeklyLeaderboardHistory.findMany({
        where: { weekId: weekId },
        orderBy: { rank: 'asc' },
        take: 15,
        include: {
          user: true, // Include the full user object to get the walletAddress
        },
      })
    );

    if (leaderboardSnapshot.length === 0) {
      console.log(`No leaderboard snapshot found for week ${weekId}.`);
      return NextResponse.json({ success: true, message: 'No users to reward for the previous week.' });
    }

    console.log(`Found ${leaderboardSnapshot.length} users to reward.`);

    const provider = new ethers.WebSocketProvider(process.env.TESTNET_RPC_WSS_URL || "");
    const wallet = new ethers.Wallet(process.env.REWARDER_PRIVATE_KEY, provider);
    const gameContract = new ethers.Contract(process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS || "", gameAbi, wallet);
    const sender = await wallet.getAddress();

    for (const entry of leaderboardSnapshot) {
      if (!entry.user || !entry.user.walletAddress) {
        console.warn(`Skipping user with ID ${entry.userId} (Rank ${entry.rank}) due to missing wallet address.`);
        continue;
      }

      if (entry.rewardEarned.toNumber() <= 0) {
        console.log(`Skipping user ${entry.user.username} (Rank ${entry.rank}) as they have no reward to claim.`);
        continue;
      }

      try {
        const rewardAmount = ethers.parseEther(entry.rewardEarned.toString());
        
        const tx = await gameContract.sendReward(sender, [entry.user.walletAddress], rewardAmount);
        
        console.log(`Reward transaction sent for ${entry.user.username} (Rank ${entry.rank}): ${tx.hash}`);
        await tx.wait();
        console.log(`Transaction confirmed for ${entry.user.username}.`);

      } catch (txError) {
        console.error(`Failed to send reward to ${entry.user.username} (Rank ${entry.rank}):`, txError);
        // Log and continue to the next user
      }
    }

    return NextResponse.json({ success: true, message: 'Weekly rewards distribution completed.' });
  } catch (error) {
    console.error('Error distributing weekly rewards after multiple retries:', error);
    //@ts-ignore
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
