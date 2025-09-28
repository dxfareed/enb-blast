import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { TaskType } from '@prisma/client';

function getStartOfUTCDay() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get('fid');

  if (!fid) {
    return NextResponse.json({ error: 'FID is required' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { fid: BigInt(fid) },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const todayUTC = getStartOfUTCDay();

    const totalDailyTasks = await prisma.task.count({
      where: { type: TaskType.DAILY },
    });

    const completedDailyTasksCount = await prisma.userTaskCompletion.count({
      where: {
        userId: user.id,
        task: {
          type: TaskType.DAILY,
        },
        completedAt: {
          gte: todayUTC,
        },
      },
    });

    const hasIncompleteDailyTasks = completedDailyTasksCount < totalDailyTasks;

    const totalDefaultTasks = await prisma.task.count({
      where: { type: TaskType.DEFAULT },
    });

    const completedDefaultTasksCount = await prisma.userTaskCompletion.count({
      where: {
        userId: user.id,
        task: {
          type: TaskType.DEFAULT,
        },
      },
    });

    const hasIncompleteDefaultTasks = completedDefaultTasksCount < totalDefaultTasks;

    const hasIncompleteTasks = hasIncompleteDailyTasks || hasIncompleteDefaultTasks;

    return NextResponse.json({ hasIncompleteTasks });

  } catch (error) {
    console.error('Failed to fetch task status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
