import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withRetry } from '../../../../lib/retry';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await withRetry(async () => {
      const dailyTasks = await prisma.task.findMany({
        where: {
          type: 'DAILY',
        },
      });

      if (dailyTasks.length > 0) {
        const dailyTaskIds = dailyTasks.map(task => task.id);
        const result = await prisma.userTaskCompletion.deleteMany({
          where: {
            taskId: {
              in: dailyTaskIds,
            },
          },
        });
        console.log(`Reset ${result.count} daily task completions.`);
      } else {
        console.log('No daily tasks found.');
      }
    });

    return NextResponse.json({ success: true, message: 'Daily tasks reset successfully.' });
  } catch (error) {
    console.error('Error resetting daily tasks after multiple retries:', error);
    // @ts-ignore
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}