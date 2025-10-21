import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withRetry } from '../../../../lib/retry';
import { headers } from 'next/headers';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const headersList = headers();
  const authHeader = (await headersList).get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const secret = authHeader.substring(7); // Remove "Bearer " prefix

  if (!process.env.CRON_SECRET || !secret.startsWith(process.env.CRON_SECRET)) {
    console.log('Secret mismatch. Received:', secret);
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