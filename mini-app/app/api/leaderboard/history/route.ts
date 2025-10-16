
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getWeek } from 'date-fns';

const prisma = new PrismaClient();

// Helper to get the week ID for the *previous* week
const getLastWeekId = (): string => {
  const now = new Date();
  // Go back 7 days to ensure we are in the previous week
  const lastWeek = new Date(now.setDate(now.getDate() - 7));
  const year = lastWeek.getUTCFullYear();
  const week = getWeek(lastWeek, { weekStartsOn: 1 }); // Assuming week starts on Monday
  return `${year}-${week.toString().padStart(2, '0')}`;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get('fid');

  if (!fid) {
    return NextResponse.json({ message: 'FID is required' }, { status: 400 });
  }

  try {
    const weekId = getLastWeekId();

    // Find the user first to get their ID
    const user = await prisma.user.findUnique({
      where: { fid: BigInt(fid) },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Now, fetch the history for that user for the last week
    const history = await prisma.weeklyLeaderboardHistory.findUnique({
      where: {
        weekId_userId: {
          weekId: weekId,
          userId: user.id,
        },
      },
    });

    if (!history) {
      return NextResponse.json({ currentUserHistory: null, message: 'No history found for last week.' });
    }
    
    // To keep the response structure similar, we can format it like this
    const currentUserHistory = {
        username: user.username,
        pfpUrl: user.pfpUrl,
        weeklyPoints: history.weeklyPoints.toString(),
        rank: history.rank,
        rewardEarned: history.rewardEarned.toString(),
    };

    return NextResponse.json({ currentUserHistory });

  } catch (error) {
    console.error('Error fetching leaderboard history:', error);
    // @ts-ignore
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
