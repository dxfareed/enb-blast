
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await prisma.user.updateMany({
      data: {
        weeklyPoints: 0,
      },
    });
    console.log(`Reset weekly points for ${result.count} users.`);
    return NextResponse.json({ success: true, message: `Reset weekly points for ${result.count} users.` });
  } catch (error) {
    console.error('Error resetting weekly points:', error);
    //@ts-ignore
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
