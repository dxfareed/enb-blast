// File: /api/leaderboard/route.ts

import prisma from '../../../lib/prisma'
import { NextResponse } from 'next/server';

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
        totalClaimed: true,
        walletAddress: true,
      },
    });

    const topUsers = users.slice(0, 100);

    // --- MODIFICATION START ---
    let currentUserData = null;
    if (fid) {
      const userIndex = users.findIndex(user => user.fid.toString() === fid);
      
      if (userIndex !== -1) {
        const user = users[userIndex];
        // Now, we create a full object with all the user's data AND their rank
        currentUserData = {
          ...user,
          rank: userIndex + 1, // Add the rank property to the user object
          weeklyPoints: user.weeklyPoints.toString(),
          totalClaimed: (user.totalClaimed ?? 0).toString(),
          fid: user.fid.toString(),
          walletAddress: user.walletAddress,
        };
      }
    }
    // --- MODIFICATION END ---

    const serializableTopUsers = topUsers.map(user => ({
      ...user,
      weeklyPoints: user.weeklyPoints.toString(),
      totalClaimed: (user.totalClaimed ?? 0).toString(),
      fid: user.fid.toString(),
      walletAddress: user.walletAddress,
    }));
    
    // We now return a `currentUser` object instead of just a `rank` number
    return NextResponse.json({ topUsers: serializableTopUsers, currentUser: currentUserData }, { status: 200 });

  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json({ message: 'Error fetching leaderboard' }, { status: 500 });
  }
}