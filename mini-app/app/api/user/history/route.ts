import prisma from '../../../../lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

//const prisma = new PrismaClient();

// /api/user/history?walletAddress=0x123...
 
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get('walletAddress');

  if (!walletAddress) {
    return NextResponse.json({ message: 'Wallet address is required' }, { status: 400 });
  }

  try {
    const userWithClaims = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: {
        claims: {
          orderBy: {
            timestamp: 'desc',
          },
        },
      },
    });

    if (!userWithClaims) {
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(userWithClaims.claims, { status: 200 });

  } catch (error) {
    console.error("Error fetching user history:", error);
    return NextResponse.json({ message: 'Error fetching history' }, { status: 500 });
  }
}