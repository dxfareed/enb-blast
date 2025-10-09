import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: {
      registrationStatus: 'ACTIVE',
    },
    data: {
      registrationStatus: 'PENDING',
    },
  });
  console.log(`Updated ${result.count} users from ACTIVE to PENDING.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
