// scripts/update-user-profiles.ts
import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';

async function fetchFarcasterProfile(fid: bigint | string) {
  const neynarApiKey = process.env.NEYNAR_API_KEY;
  if (!neynarApiKey) {
    throw new Error("NEYNAR_API_KEY environment variable is not set.");
  }

  const url = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'accept': 'application/json', 'api_key': neynarApiKey },
  });

  if (!response.ok) {
    console.error(`Neynar API failed for FID ${fid} with status ${response.status}`);
    return null;
  }
  
  const data = await response.json();
  if (!data.users || data.users.length === 0) {
    console.warn(`Farcaster user with FID ${fid} not found via Neynar.`);
    return null;
  }
  
  const user = data.users[0];
  return {
    username: user.username,
    pfpUrl: user.pfp_url,
  };
}

async function main() {
  console.log("Starting user profile update script...");

  const activeUsers = await prisma.user.findMany({
    where: {
      registrationStatus: 'ACTIVE',
    },
  });

  console.log(`Found ${activeUsers.length} active users to check.`);

  let updatedCount = 0;
  let checkedCount = 0;

  for (const user of activeUsers) {
    checkedCount++;
    try {
      const farcasterProfile = await fetchFarcasterProfile(user.fid);

      if (!farcasterProfile) {
        continue;
      }

      const updates: Prisma.UserUpdateInput = {};

      if (user.username !== farcasterProfile.username) {
        updates.username = farcasterProfile.username;
      }

      if (user.pfpUrl !== farcasterProfile.pfpUrl) {
        updates.pfpUrl = farcasterProfile.pfpUrl;
      }

      if (Object.keys(updates).length > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: updates,
        });
        console.log(`Updated user ${user.username} (FID: ${user.fid}) with new profile info:`, updates);
        updatedCount++;
      }
    } catch (error) {
      console.error(`Failed to process user with FID ${user.fid}:`, error);
    }
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log("\nScript finished.");
  console.log(`Checked ${checkedCount} users.`);
  console.log(`Updated ${updatedCount} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
