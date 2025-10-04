import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MAX_RETRIES = 5;
const RETRY_DELAY = 10000; // 10 seconds

async function main() {
  console.log('🚀 Starting daily claim reset job...');

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const result = await prisma.user.updateMany({
        data: {
          claimsToday: 0,
        },
      });

      console.log(`   - ✅ Successfully reset claim counts for ${result.count} users.`);
      await prisma.$disconnect();
      return; // Exit successfully
    } catch (error) {
      console.error(`   - ❌ Attempt ${i + 1}/${MAX_RETRIES} failed:`, error.message);
      if (i < MAX_RETRIES - 1) {
        console.log(`   -  Retrying in ${RETRY_DELAY / 1000} seconds...`);
        await new Promise(res => setTimeout(res, RETRY_DELAY));
      } else {
        console.error('   - ❌ All retry attempts failed. Exiting.');
        await prisma.$disconnect();
        process.exit(1);
      }
    }
  }
}

main();
