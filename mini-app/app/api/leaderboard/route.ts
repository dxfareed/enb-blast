import prisma from '../../../lib/prisma'
import { NextResponse } from 'next/server';

//const prisma = new PrismaClient();

// /api/leaderboard

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get('fid');

  try {
    const users = await prisma.user.findMany({
      orderBy: {
        weeklyPoints: 'desc',
      },
      select: {
        fid: true,
        username: true,
        pfpUrl: true,
        weeklyPoints: true,
        level: true,
        walletAddress: true,
      },
    });

    const topUsers = users.slice(0, 10);

    let currentUserRank = null;
    if (fid) {
      const userIndex = users.findIndex(user => user.fid.toString() === fid);
      if (userIndex !== -1) {
        currentUserRank = userIndex + 1;
      }
    }

    //@ts-ignore
    const serializableUsers = topUsers.map(user => ({
      ...user,
      weeklyPoints: user.weeklyPoints.toString(),
      fid: user.fid.toString(),
    }));

    return NextResponse.json({ topUsers: serializableUsers, rank: currentUserRank }, { status: 200 });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json({ message: 'Error fetching leaderboard' }, { status: 500 });
  }
}