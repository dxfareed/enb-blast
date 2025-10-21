import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getWeek } from 'date-fns';

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
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get('fid');

  if (!fid) {
    return NextResponse.json({ message: 'FID is required' }, { status: 400 });
  }

  try {
    const weekId = getLastWeekId();
    
    const userHistory = await prisma.weeklyLeaderboardHistory.findFirst({
      where: {
        weekId: weekId,
        user: {
          fid: BigInt(fid),
        },
      },
      include: {
        user: {
          select: {
            username: true,
            pfpUrl: true,
          },
        },
      },
    });

    if (!userHistory) {
      return NextResponse.json({ message: "You weren't on the leaderboard last week. Keep playing!" }, { status: 404 });
    }

    const response = {
      fid: fid,
      username: userHistory.user.username,
      pfpUrl: userHistory.user.pfpUrl,
      weeklyPoints: userHistory.weeklyPoints.toString(),
      rank: userHistory.rank,
      rewardEarned: userHistory.rewardEarned.toString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching weekly leaderboard history:', error);
    return NextResponse.json({ message: 'An error occurred while fetching weekly stats.' }, { status: 500 });
  }
}