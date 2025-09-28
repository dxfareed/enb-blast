import { PrismaClient, TaskType } from '@prisma/client';
const prisma = new PrismaClient();

const tasks = [
  { title: 'Follow DEV', description: 'Follow the developer on Farcaster.', rewardPoints: 200, type: TaskType.DEFAULT, actionUrl: 'https://farcaster.xyz/dxfareed', checkKey: 'FARCASTER_FOLLOW_DXFAREED' },
  { title: 'Follow ENB FOUNDER', description: 'Follow ENB founder on Farcaster.', rewardPoints: 200, type: TaskType.DEFAULT, actionUrl: 'https://farcaster.xyz/kokocodes', checkKey: 'FARCASTER_FOLLOW_KOKOCODES' },
  { title: 'Follow ENB Community on farcaster', description: 'Join the ENB community channel for the latest updates and discussions.', rewardPoints: 300, type: TaskType.DEFAULT, actionUrl: 'https://farcaster.xyz/~/channel/enb', checkKey: 'FARCASTER_FOLLOW_ENB_CHANNEL' },
  { title: 'Subscribe to ENB YouTube Channel', description: 'Subscribe to the official ENB Mini Apps YouTube channel.', rewardPoints: 300, type: TaskType.DEFAULT, actionUrl: 'https://youtube.com/@enbminiapps?si=Vzf_-DeReYEVK3lu', checkKey: 'YOUTUBE_SUBSCRIBE_ENBMINIAPPS' },
  { title: 'Subscribe to ENB on Paragraph', description: 'Subscribe to the ENB Bit-Sized Scoop on Paragraph.', rewardPoints: 300, type: TaskType.DEFAULT, actionUrl: 'https://paragraph.com/@enb-bit-sized-scoop/enb-ecosystem-weekly-scoops-7', checkKey: 'PARAGRAPH_SUBSCRIBE_ENB' },
  { title: 'Follow ENB on Zora', description: 'Follow the official ENB account on Zora.', rewardPoints: 500, type: TaskType.DEFAULT, actionUrl: 'https://zora.co/@enb', checkKey: 'ZORA_FOLLOW_ENB' },
  { title: 'Hold 100k+ ENB', description: 'Hold at least 100,000 ENB tokens.', rewardPoints: 100, type: TaskType.DEFAULT, checkKey: 'HOLD_100K_ENB' },
  { title: 'Hold 500k+ ENB', description: 'Hold at least 500,000 ENB tokens.', rewardPoints: 500, type: TaskType.DEFAULT, checkKey: 'HOLD_500K_ENB' },
  { title: 'Hold 1M+ ENB', description: 'Hold at least 1,000,000 ENB tokens.', rewardPoints: 1000, type: TaskType.DEFAULT, checkKey: 'HOLD_1M_ENB' },
  { title: 'Based Membership', description: 'Achieve the Based membership level.', rewardPoints: 100, type: TaskType.DEFAULT, checkKey: 'MEMBERSHIP_BASED' },
  { title: 'SuperBased Membership', description: 'Achieve the SuperBased membership level.', rewardPoints: 200, type: TaskType.DEFAULT, checkKey: 'MEMBERSHIP_SUPERBASED' },
  { title: 'Legendary Membership', description: 'Achieve the Legendary membership level.', rewardPoints: 500, type: TaskType.DEFAULT, checkKey: 'MEMBERSHIP_LEGENDARY' },
  { title: 'Play the Game', description: 'Play at least one round of ENB Pop.', rewardPoints: 100, type: TaskType.DAILY, checkKey: 'GAME_PLAYED' },
  { title: 'Claim Your Tokens', description: 'Make a successful on-chain claim.', rewardPoints: 100, type: TaskType.DAILY, checkKey: 'TOKEN_CLAIMED' },
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