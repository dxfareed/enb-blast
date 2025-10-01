import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { Errors, createClient } from "@farcaster/quick-auth";

function getStartOfUTCDay() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

const client = createClient();

function getUrlHost(request: NextRequest) {
    const origin = request.headers.get("origin");
    if (origin) {
      try {
        const url = new URL(origin);
        return url.host;
      } catch (error) {
        console.warn("Invalid origin header:", origin, error);
      }
    }
  
    const host = request.headers.get("host");
    if (host) {
      return host;
    }
  
    let urlValue: string;
    if (process.env.VERCEL_ENV === "production") {
      urlValue = process.env.NEXT_PUBLIC_URL!;
    } else if (process.env.VERCEL_URL) {
      urlValue = `https://${process.env.VERCEL_URL}`;
    } else {
      urlValue = "http://localhost:3000";
    }
  
    const url = new URL(urlValue);
    return url.host;
}

const allowedCheckKeys = [
  'YOUTUBE_SUBSCRIBE_ENBMINIAPPS',
  'PARAGRAPH_SUBSCRIBE_ENB',
  'ZORA_FOLLOW_ENB',
];

export async function POST(request: NextRequest) {
    const authorization = request.headers.get("Authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
        return NextResponse.json({ message: "Missing token" }, { status: 401 });
    }

  try {
    const payload = await client.verifyJwt({
        token: authorization.split(" ")[1] as string,
        domain: getUrlHost(request),
    });
    const fid = payload.sub;
    const { checkKey } = await request.json();

    if (!checkKey) {
      return new NextResponse('Task checkKey is required', { status: 400 });
    }

    if (!allowedCheckKeys.includes(checkKey)) {
      return new NextResponse('This task cannot be force-completed', { status: 403 });
    }

    const [user, task] = await Promise.all([
      prisma.user.findUnique({ where: { fid: BigInt(fid) } }),
      prisma.task.findUnique({ where: { checkKey } }),
    ]);

    if (!user) return new NextResponse('User not found', { status: 404 });
    if (!task) return new NextResponse('Task not found', { status: 404 });
    
    const todayUTC = getStartOfUTCDay();
    const existingCompletion = await prisma.userTaskCompletion.findFirst({
      where: {
        userId: user.id,
        taskId: task.id,
        ...(task.type === 'DAILY' && { completedAt: { gte: todayUTC } }),
      },
    });

    if (existingCompletion) {
      return NextResponse.json({ message: 'Task already completed' }, { status: 409 });
    }

    await prisma.$transaction([
      prisma.userTaskCompletion.create({
        data: { userId: user.id, taskId: task.id },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          totalPoints: { increment: task.rewardPoints },
          weeklyPoints: { increment: task.rewardPoints },
        },
      }),
    ]);

    return NextResponse.json({ message: 'Task completed!' });

  } catch (error) {
    if (error instanceof Errors.InvalidTokenError) {
        return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    console.error("Failed to force-complete task:", error);
    return new NextResponse('Error force-completing task', { status: 500 });
  }
}
