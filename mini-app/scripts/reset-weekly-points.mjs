import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log(`Start resetting weekly points for all users...`);

  const result = await prisma.user.updateMany({
    data: {
      weeklyPoints: 0,
    },
  });

  console.log(`Successfully reset weekly points for ${result.count} users.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
