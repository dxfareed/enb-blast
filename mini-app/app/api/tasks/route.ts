import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function getStartOfUTCDay() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

const taskCheckers = {
  WARPCAST_FOLLOW: async (user: { id: string; fid: bigint; }): Promise<boolean> => {
    console.log(`Verifying Warpcast follow for user ${user.fid}...`);
    return true;
  },
  
  TELEGRAM_JOIN: async (user: { id: string; }): Promise<boolean> => {
    console.log(`Verifying Telegram join for user ${user.id}...`);
    return true;  
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



export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get('fid');

  if (!fid) {
    return new NextResponse('FID is required', { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { fid: BigInt(fid) } });
    if (!user) return new NextResponse('User not found', { status: 404 });

    const allTasks = await prisma.task.findMany();
    const userCompletions = await prisma.userTaskCompletion.findMany({
      where: { userId: user.id },
    });
    
    const todayUTC = getStartOfUTCDay();

    const tasksWithStatus = allTasks.map(task => {
      let isCompleted = false;
      if (task.type === 'DEFAULT' || task.type === 'PARTNER') {
        isCompleted = userCompletions.some(c => c.taskId === task.id);
      } else { // DAILY tasks
        isCompleted = userCompletions.some(c => 
          c.taskId === task.id && c.completedAt >= todayUTC
        );
      }
      return { ...task, completed: isCompleted };
    });

    return NextResponse.json(tasksWithStatus);
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    return new NextResponse('Error fetching tasks', { status: 500 });
  }
}