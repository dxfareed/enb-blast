import prisma from '../../../lib/prisma'
import { NextResponse } from 'next/server';

//const prisma = new PrismaClient();

// /api/leaderboard

export async function GET() {
  try {
    const topUsers = await prisma.user.findMany({
      //highest first
      orderBy: {
        totalClaimed: 'desc',
      },
      // limit top 10 only
      take: 10,
      select: {
        username: true,
        pfpUrl: true,
        totalClaimed: true,
        level: true,
        walletAddress:true,
      },
    });

    //@ts-ignore
    const serializableUsers = topUsers.map(user => ({
      ...user,
      totalClaimed: user.totalClaimed.toString(),
    }));

    return NextResponse.json(serializableUsers, { status: 200 });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json({ message: 'Error fetching leaderboard' }, { status: 500 });
  }
}