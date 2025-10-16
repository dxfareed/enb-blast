import { PrismaClient, TaskType } from '@prisma/client';
const prisma = new PrismaClient();

const tasks = [
  { title: 'Follow DEV', description: 'Follow the developer on Farcaster.', rewardPoints: 50, type: TaskType.DEFAULT, actionUrl: 'https://farcaster.xyz/dxfareed', checkKey: 'FARCASTER_FOLLOW_DXFAREED' },
  { title: 'Follow ENB FOUNDER', description: 'Follow ENB founder on Farcaster.', rewardPoints: 50, type: TaskType.DEFAULT, actionUrl: 'https://farcaster.xyz/kokocodes', checkKey: 'FARCASTER_FOLLOW_KOKOCODES' },
  { title: 'Follow ENB Community on farcaster', description: 'Join the ENB community channel for the latest updates and discussions.', rewardPoints: 100, type: TaskType.DEFAULT, actionUrl: 'https://farcaster.xyz/~/channel/enb', checkKey: 'FARCASTER_FOLLOW_ENB_CHANNEL' },
  { title: 'Follow ENB account', description: 'Follow the official ENB account on Farcaster.', rewardPoints: 50, type: TaskType.DEFAULT, actionUrl: 'https://farcaster.xyz/enb', checkKey: 'FARCASTER_FOLLOW_ENB' },
  { title: 'Subscribe to ENB YouTube Channel', description: 'Subscribe to the official ENB Mini Apps YouTube channel.', rewardPoints: 50, type: TaskType.DEFAULT, actionUrl: 'https://youtube.com/@enbminiapps?si=Vzf_-DeReYEVK3lu', checkKey: 'YOUTUBE_SUBSCRIBE_ENBMINIAPPS' },
  { title: 'Subscribe to ENB on Paragraph', description: 'Subscribe to the ENB Bit-Sized Scoop on Paragraph.', rewardPoints: 50, type: TaskType.DEFAULT, actionUrl: 'https://paragraph.com/@enb-bit-sized-scoop/enb-ecosystem-weekly-scoops-7', checkKey: 'PARAGRAPH_SUBSCRIBE_ENB' },
  { title: 'Follow ENB on Zora', description: 'Follow the official ENB account on Zora.', rewardPoints: 500, type: TaskType.DEFAULT, actionUrl: 'https://zora.co/@enb', checkKey: 'ZORA_FOLLOW_ENB' },
  { title: 'Join ENB on Telegram', description: 'Join the community for real-time discussions.', rewardPoints: 50, type: TaskType.DEFAULT, actionUrl: 'https://t.me/+_cGFbzCqtEthNDNk', checkKey: 'TELEGRAM_JOIN_ENB' },
  { title: 'Join the ENB Discord', description: 'Join our Discord community for announcements and support.', rewardPoints: 50, type: TaskType.DEFAULT, actionUrl: 'https://discord.gg/n7XUtBmuQ', checkKey: 'DISCORD_JOIN_ENB' },
  { title: 'Hold 100k+ ENB', description: 'Hold at least 100,000 ENB tokens.', rewardPoints: 100, type: TaskType.DEFAULT, checkKey: 'HOLD_100K_ENB' },
  { title: 'Hold 500k+ ENB', description: 'Hold at least 500,000 ENB tokens.', rewardPoints: 500, type: TaskType.DEFAULT, checkKey: 'HOLD_500K_ENB' },
  { title: 'Hold 1M+ ENB', description: 'Hold at least 1,000,000 ENB tokens.', rewardPoints: 1000, type: TaskType.DEFAULT, checkKey: 'HOLD_1M_ENB' },
  { title: 'Based Membership', description: 'Achieve the Based membership level.', rewardPoints: 75, type: TaskType.DEFAULT, checkKey: 'MEMBERSHIP_BASED' },
  { title: 'SuperBased Membership', description: 'Achieve the SuperBased membership level.', rewardPoints: 100, type: TaskType.DEFAULT, checkKey: 'MEMBERSHIP_SUPERBASED' },
  { title: 'Legendary Membership', description: 'Achieve the Legendary membership level.', rewardPoints: 200, type: TaskType.DEFAULT, checkKey: 'MEMBERSHIP_LEGENDARY' },
  { title: 'Play the Game', description: 'Play at least one round of ENB Blast.', rewardPoints: 200, type: TaskType.DAILY, checkKey: 'GAME_PLAYED' },
  { title: 'Claim Your Tokens', description: 'Make a successful claim.', rewardPoints: 200, type: TaskType.DAILY, checkKey: 'TOKEN_CLAIMED' },
  { title: 'Visit the Leaderboard', description: 'Check out the competition.', rewardPoints: 200, type: TaskType.DAILY, actionUrl: '/dashboard/leaderboard', checkKey: 'LEADERBOARD_VISIT' },
  { title: 'Use the ENB Mining App', description: 'Engage with the ENB ecosystem by using the ENB Mining App.', rewardPoints: 100, type: TaskType.DEFAULT, actionUrl: 'https://farcaster.xyz/miniapps/4uqcueQifUYV/enb-mining', checkKey: 'MINI_APP_OPEN_MINING' },
  { title: 'Use the ENB Bounty App', description: 'Explore bounties and opportunities within the ENB ecosystem through the Bounty App.', rewardPoints: 100, type: TaskType.DEFAULT, actionUrl: 'https://farcaster.xyz/miniapps/0GzdUkFK2f7A/enb-bounty', checkKey: 'MINI_APP_OPEN_BOUNTY' },
  { title: 'Mint ENB Bounty NFT', description: 'Mint your exclusive ENB Bounty NFT to mark your participation in the ecosystem.', rewardPoints: 250, type: TaskType.DEFAULT, actionUrl: 'https://farcaster.xyz/miniapps/0GzdUkFK2f7A/enb-bounty', checkKey: 'MINT_ENB_BOUNTY_NFT' },
  { title: 'Follow ENB on X', description: 'Follow the official ENB account on X.', rewardPoints: 50, type: TaskType.DEFAULT, actionUrl: 'https://x.com/EverybNeedsBase', checkKey: 'X_FOLLOW_ENB' },
  { title: 'Follow ENB Apps on X', description: 'Follow the official ENB Apps account on X.', rewardPoints: 1000, type: TaskType.DEFAULT, actionUrl: 'https://x.com/enbapps', checkKey: 'X_FOLLOW_ENB_APPS' },
  { 
    title: '1m $ENB tournament on scoreline', 
    description: 'Join tournament, Predict and Win', 
    rewardPoints: 3000, 
    type: TaskType.PARTNER, 
    actionUrl: 'https://base.scoreline.fun/matches?tournamentId=1&poolId=5',
    checkKey: 'SCORELINE_TOURNAMENT_JOIN',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
  },
  { 
    title: 'Hold 10k+ $CAP', 
    description: 'Hold at least 10,000 $CAP (Capminal) tokens.', 
    rewardPoints: 4000, 
    type: TaskType.PARTNER, 
    checkKey: 'HOLD_10K_CAP',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
  },
  { 
    title: 'Use the Capminal Mini App', 
    description: 'Engage with the Capminal ecosystem by using their Mini App.', 
    rewardPoints: 3000, 
    type: TaskType.PARTNER, 
    actionUrl: 'https://farcaster.xyz/miniapps/lwBYO_1-Hga8/capminal',
    checkKey: 'MINI_APP_OPEN_CAPMINAL',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
  },
  /* { 
    title: 'Partner Task: Special Event', 
    description: 'Complete this special event task for a unique reward!', 
    rewardPoints: 1000, 
    type: TaskType.PARTNER, 
    checkKey: 'PARTNER_SPECIAL_EVENT',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
  }, */
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