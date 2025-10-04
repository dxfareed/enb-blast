
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
