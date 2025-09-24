import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getUTCFullYear() === date2.getUTCFullYear() &&
         date1.getUTCMonth() === date2.getUTCMonth() &&
         date1.getUTCDate() === date2.getUTCDate();
}

export async function POST(request: Request) {
  const { fid } = await request.json();

  if (!fid) {
    return new NextResponse('FID is required', { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { fid: BigInt(fid) },
      include: {
        // --- THE FIX: We now fetch the last TWO claims ---
        claims: {
          orderBy: { timestamp: 'desc' },
          take: 2,
        },
      },
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    if (user.claims.length === 0) {
      return NextResponse.json({ message: 'No claims found to process', streak: 0 });
    }

    if (user.claims.length === 1) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id }, data: { streak: 1 }
      });
      return NextResponse.json({ message: 'Streak started', streak: updatedUser.streak });
    }

    const latestClaim = user.claims[0];
    const previousClaim = user.claims[1];

    if (isSameDay(latestClaim.timestamp, previousClaim.timestamp)) {
      return NextResponse.json({ message: 'Already claimed today', streak: user.streak });
    }

    const yesterday = new Date(latestClaim.timestamp);
    yesterday.setUTCDate(latestClaim.timestamp.getUTCDate() - 1);

    if (isSameDay(previousClaim.timestamp, yesterday)) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id }, data: { streak: { increment: 1 } }
      });
      return NextResponse.json({ message: 'Streak continued', streak: updatedUser.streak });
    } else {
      const updatedUser = await prisma.user.update({
        where: { id: user.id }, data: { streak: 1 }
      });
      return NextResponse.json({ message: 'Streak reset', streak: updatedUser.streak });
    }

  } catch (error) {
    console.error("Failed to update streak:", error);
    return new NextResponse('Error updating streak', { status: 500 });
  }
}