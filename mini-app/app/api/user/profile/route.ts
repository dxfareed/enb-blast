import { PrismaClient } from '../../../generated/prisma';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get('walletAddress');

  if (!walletAddress) {
    return NextResponse.json({ message: 'Wallet address is required' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ message: 'Error fetching user' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json({ message: 'Wallet address is required' }, { status: 400 });
    }

    const user = await prisma.user.upsert({
      where: { walletAddress: walletAddress.toLowerCase() },
      update: {},
      create: {
        walletAddress: walletAddress.toLowerCase(),
      },
    });
    
    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("Failed to upsert user:", error);
    return NextResponse.json({ message: 'Error creating or finding user' }, { status: 500 });
  }
}