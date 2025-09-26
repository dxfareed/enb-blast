import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function getStartOfUTCDay() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

const taskCheckers = {
  WARPCAST_FOLLOW: async (user: { id: string; fid: bigint; }): Promise<boolean> => {
    const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
    const FARCASTER_CHANNEL_ID = process.env.FARCASTER_CHANNEL_ID || "enb";

    if (!NEYNAR_API_KEY || !FARCASTER_CHANNEL_ID) {
      console.error("Missing Neynar API key or Farcaster channel ID");
      return false;
    }

    const url = `https://api.neynar.com/v2/farcaster/channel/member/list/?channel_id=${FARCASTER_CHANNEL_ID}&fid=${user.fid}`;

    try {
      const response = await fetch(url, {
        headers: {
          'x-api-key': NEYNAR_API_KEY,
        },
      });

      if (!response.ok) {
        console.error(`Neynar API request failed with status ${response.status}`);
        return false;
      }

      const data = await response.json();
      return data.members.length > 0;
    } catch (error) {
      console.error("Failed to verify Warpcast follow:", error);
      return false;
    }
  },

  FARCASTER_FOLLOW_ENB_CHANNEL: async (user: { id: string; fid: bigint; }): Promise<boolean> => {
    const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
    const FARCASTER_CHANNEL_ID = "enb";

    if (!NEYNAR_API_KEY) {
      console.error("Missing Neynar API key");
      return false;
    }

    const url = `https://api.neynar.com/v2/farcaster/channel/followers?id=${FARCASTER_CHANNEL_ID}&fid=${user.fid}`;

    try {
      const response = await fetch(url, {
        headers: {
          'api_key': NEYNAR_API_KEY,
        },
      });

      if (!response.ok) {
        console.error(`Neynar API request failed with status ${response.status}`);
        return false;
      }

      const data = await response.json();
      return data.users?.some(follower => follower.fid === Number(user.fid)) || false;
    } catch (error) {
      console.error("Failed to verify Farcaster channel follow:", error);
      return false;
    }
  },

  FARCASTER_FOLLOW_DXFAREED: async (user: { id: string; fid: bigint; }): Promise<boolean> => {
    const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
    const DXFAREED_FID = 849768;

    if (!NEYNAR_API_KEY) {
      console.error("Missing Neynar API key");
      return false;
    }

    const url = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${DXFAREED_FID}&viewer_fid=${user.fid}`;

    try {
      const response = await fetch(url, {
        headers: {
          'api_key': NEYNAR_API_KEY,
        },
      });

      if (!response.ok) {
        console.error(`Neynar API request failed with status ${response.status}`);
        return false;
      }

      const data = await response.json();
      return data.users[0]?.viewer_context?.following || false;
    } catch (error) {
      console.error("Failed to verify Farcaster follow:", error);
      return false;
    }
  },
  
  TELEGRAM_JOIN: async (user: { id: string; }): Promise<boolean> => {
    console.log(`Verifying Telegram join for user ${user.id}...`);
    return true; // Dummy implementation
  },

  GAME_PLAYED: async (user: { id: string; }): Promise<boolean> => {
    return taskCheckers.TOKEN_CLAIMED(user);
  },

  TOKEN_CLAIMED: async (user: { id: string; }): Promise<boolean> => {
    console.log(`Verifying token claim for user ${user.id}...`);
    const todayUTC = getStartOfUTCDay();
    const recentClaim = await prisma.claim.findFirst({
      where: {
        userId: user.id,
        timestamp: { gte: todayUTC },
      },
    });
    return !!recentClaim;
  },

  LEADERBOARD_VISIT: async (user: { id: string; }): Promise<boolean> => {
    console.log(`Verifying leaderboard visit for user ${user.id}...`);
    return true;
  },
};

export async function POST(request: Request) {
  const { fid, checkKey } = await request.json();

  if (!fid || !checkKey) {
    return new NextResponse('FID and task checkKey are required', { status: 400 });
  }

  try {
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

    const checker = taskCheckers[checkKey as keyof typeof taskCheckers];
    if (!checker) throw new Error(`No checker found for task: ${checkKey}`);

    const isVerified = await checker(user);

    if (!isVerified) {
      return NextResponse.json({ message: 'Task verification failed. Please try again.' }, { status: 400 });
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

    return NextResponse.json({ message: 'Task verified and points awarded!' });

  } catch (error) {
    console.error("Failed to verify task:", error);
    return new NextResponse('Error verifying task', { status: 500 });
  }
}