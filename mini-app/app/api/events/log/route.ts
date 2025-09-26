import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  const { fid, eventType } = await request.json();

  if (!fid || !eventType) {
    return NextResponse.json({ error: 'FID and eventType are required' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { fid: BigInt(fid) },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await prisma.userEvent.create({
      data: {
        userId: user.id,
        type: eventType,
      },
    });

    return NextResponse.json({ message: 'Event logged successfully' });

  } catch (error) {
    console.error('Failed to log event:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
