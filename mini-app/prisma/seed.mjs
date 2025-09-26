import { PrismaClient, TaskType } from '@prisma/client';
const prisma = new PrismaClient();

const tasks = [
  { title: 'Follow Dev: dxFareed', description: 'Follow the developer on Farcaster.', rewardPoints: 500, type: TaskType.DEFAULT, actionUrl: 'https://farcaster.xyz/dxfareed', checkKey: 'FARCASTER_FOLLOW_DXFAREED' },
  { title: 'Follow ENB Community on farcaster', description: 'Join the ENB community channel for the latest updates and discussions.', rewardPoints: 500, type: TaskType.DEFAULT, actionUrl: 'https://farcaster.xyz/~/channel/enb', checkKey: 'FARCASTER_FOLLOW_ENB_CHANNEL' },
  { title: 'Play the Game', description: 'Play at least one round of ENB Pop.', rewardPoints: 100, type: TaskType.DAILY, checkKey: 'GAME_PLAYED' },
  { title: 'Claim Your Tokens', description: 'Make a successful on-chain claim.', rewardPoints: 150, type: TaskType.DAILY, checkKey: 'TOKEN_CLAIMED' },
  { title: 'Visit the Leaderboard', description: 'Check out the competition.', rewardPoints: 50, type: TaskType.DAILY, actionUrl: '/dashboard/leaderboard', checkKey: 'LEADERBOARD_VISIT' },
];

async function main() {
  console.log(`Start seeding ...`);
  for (const task of tasks) {
    const createdTask = await prisma.task.upsert({
      where: { checkKey: task.checkKey },
      update: {},
      create: task,
    });
    console.log(`Created or found task with id: ${createdTask.id}`);
  }
  console.log(`Seeding finished.`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });