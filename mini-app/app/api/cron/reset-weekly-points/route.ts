import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getWeek } from 'date-fns';
import { REWARD_AMOUNTS } from '@/lib/rewardTiers';
import { headers } from 'next/headers';

const prisma = new PrismaClient();

const withRetry = async <T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 2000 // 2 seconds
): Promise<T> => {
  let lastError: Error | undefined;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.log(`Operation failed. Attempt ${i + 1} of ${retries}. Retrying in ${delay / 1000}s...`);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};

// Helper to get the week ID in the format YYYY-WW
const getWeekId = (date: Date): string => {
  const year = date.getUTCFullYear();
  const week = getWeek(date, { weekStartsOn: 1 }); // Assuming week starts on Monday
  return `${year}-${week.toString().padStart(2, '0')}`;
};

// Define the reward tiers to calculate rewardEarned for the snapshot
const REWARD_TIERS = REWARD_AMOUNTS;

export async function GET(request: Request) {
  const headersList = headers();
  const authHeader = (await headersList).get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const secret = authHeader.substring(7); // Remove "Bearer " prefix

  if (!process.env.CRON_SECRET || !secret.startsWith(process.env.CRON_SECRET)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    let userCount = 0;

    await withRetry(async () => {
      // --- 1. Snapshot the leaderboard ---
      const topUsers = await prisma.user.findMany({
        orderBy: {
          weeklyPoints: 'desc',
        },
        take: 15,
      });

      if (topUsers.length > 0) {
        const weekId = getWeekId(new Date());
        const historyData = topUsers.map((user, index) => {
          const rank = index + 1;
          const rewardEarned = REWARD_TIERS[rank] || 0;
          return {
            weekId,
            userId: user.id,
            rank,
            weeklyPoints: user.weeklyPoints,
            rewardEarned,
          };
        });

        await prisma.weeklyLeaderboardHistory.createMany({
          data: historyData,
          skipDuplicates: true,
        });
        console.log(`Successfully created leaderboard snapshot for week ${weekId} with ${historyData.length} users.`);
      }

      const result = await prisma.user.updateMany({
        data: {
          weeklyPoints: 0,
        },
      });
      userCount = result.count;
      console.log(`Reset weekly points for ${userCount} users.`);
    });
    
    return NextResponse.json({ 
      success: true, 
      message: `Snapshot created and weekly points reset for ${userCount} users.` 
    });

  } catch (error) {
    console.error('Error in weekly reset cron job after multiple retries:', error);
    //@ts-ignore
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}