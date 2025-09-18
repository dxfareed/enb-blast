import prisma from '../../../../lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fid = searchParams.get('fid');

  if (!fid) {
    return NextResponse.json({ message: 'Farcaster ID (fid) is required' }, { status: 400 });
  }

  try {
    const userWithClaims = await prisma.user.findUnique({
      where: { fid: BigInt(fid) },
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

    //@ts-ignore
    const serializableClaims = userWithClaims.claims.map(claim => ({
      ...claim,
      amount: claim.amount.toString(),
    }));

    return NextResponse.json(serializableClaims, { status: 200 });

  } catch (error) {
    console.error("Error fetching user history:", error);
    return NextResponse.json({ message: 'Error fetching history' }, { status: 500 });
  }
}