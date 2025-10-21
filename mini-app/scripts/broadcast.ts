import 'dotenv/config';
import prisma from '../lib/prisma';
import { sendRewards } from '../lib/own';

interface NotificationDetails {
  [key: string]: any;
}

type UserToNotify = {
  fid: bigint;
  notificationToken: string | null;
  walletAddress?: string;
};

async function sendNotifications(
  usersToNotify: UserToNotify[],
  notificationConfig: { title: string; body: string; },
  apiUrl: string,
  apiSecret: string
) {
  if (usersToNotify.length === 0) {
    console.log("No users to notify.");
    return;
  }

  console.log(`Found ${usersToNotify.length} user(s) to notify.`);
  let successCount = 0;
  let errorCount = 0;

  for (const user of usersToNotify) {
    const fid = Number(user.fid);

    try {
      const rawToken = user.notificationToken;

      if (!rawToken || rawToken.trim() === '') {
        console.log(`Skipping FID ${fid} due to empty token.`);
        errorCount++;
        continue;
      }

      const sanitizedToken = rawToken.trim().replace(/\0/g, '');
      const notificationDetails = JSON.parse(sanitizedToken) as NotificationDetails;

      const payload = {
        fid,
        notification: {
          ...notificationConfig,
          notificationDetails,
        },
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiSecret}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`Successfully sent notification to FID: ${fid}`);
        successCount++;
      } else {
        const errorResult = await response.json();
        console.error(`Failed to send to FID: ${fid}. Status: ${response.status}. Reason:`, errorResult.error || 'Unknown');
        errorCount++;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`Error processing FID: ${fid}. The token might be malformed.`, message);
      errorCount++;
    }
  }

  console.log("\n--- Broadcast Complete ---");
  console.log(`Successful sends: ${successCount}`);
  console.log(`Failed sends:     ${errorCount}`);
}


function getNotificationContent() {
  const REWARD_DAY_UTC = 4;
  const now = new Date();
  const currentDayUTC = now.getUTCDay();

  let title: string;
  let body: string;

  if (currentDayUTC === REWARD_DAY_UTC) {
    const rewardAmount = "42.5k";
    title = "Congratulations!";
    body = `You earned ${rewardAmount} $ENB in ENB Blast rewards this week.`;
  } else {
    const daysRemaining = (REWARD_DAY_UTC - currentDayUTC + 7) % 7;

    if (daysRemaining === 1) {
      title = `Rewards go out in 23 hours!`;
      body = `Keep blasting $ENBs for the top of the leaderboard.`;
    } else {
      title = `Rewards go out in ${daysRemaining} days!`;
      body = `Keep blasting $ENBs for the top of the leaderboard.`;
    }
  }

  return { title, body };
}

const API_URL = process.env.NEXT_PUBLIC_URL
  ? `${process.env.NEXT_PUBLIC_URL}/api/notify`
  : 'http://localhost:3000/api/notify';

const API_SECRET_KEY = process.env.API_SECRET_KEY;

async function main() {
  if (!API_SECRET_KEY) {
    console.error("Error: API_SECRET_KEY is not defined in your .env file.");
    process.exit(1);
  }

  const notificationConfig = getNotificationContent();

  console.log("Starting notification script...");
  console.log(`Message: "${notificationConfig.title} - ${notificationConfig.body}"`);

  try {
    const REWARD_DAY_UTC = 4;
    const now = new Date();
    const currentDayUTC = now.getUTCDay();

    if (currentDayUTC === REWARD_DAY_UTC) {
      console.log("It's reward day! Fetching top 15 leaderboard users...");
      const leaderboardUrl = `${API_URL.replace('/notify', '/leaderboard')}`;
      const response = await fetch(leaderboardUrl);
      const leaderboard = await response.json();
      console.log("Leaderboard data fetched.");

      if (!leaderboard.topUsers || leaderboard.topUsers.length === 0) {
        console.log("No users found on the leaderboard. Exiting.");
        return;
      }

      const top15Fids = leaderboard.topUsers.slice(0, 15).map((u: any) => BigInt(u.fid));
      console.log("Top 15 FIDs:", top15Fids);

      const usersToReward = await prisma.user.findMany({
        where: {
          notificationToken: { not: null },
          fid: { in: top15Fids },
        },
        select: {
          fid: true,
          notificationToken: true,
          walletAddress: true,
        },
      });

      if (usersToReward.length > 0) {
        const recipientAddresses = usersToReward.map(u => u.walletAddress);
        const rewardAmountPerUser = 100;
        const totalRewardAmount = rewardAmountPerUser * recipientAddresses.length;

        console.log(`Attempting to send ${totalRewardAmount} $ENB to ${recipientAddresses.length} users.`);

        try {
          const txHash = await sendRewards(recipientAddresses, totalRewardAmount);
          console.log(`Rewards transaction successful! Hash: ${txHash}`);

          // On successful transaction, send notifications
          const usersWithTokens = usersToReward.filter(u => u.notificationToken);
          await sendNotifications(usersWithTokens, notificationConfig, API_URL, API_SECRET_KEY);

        } catch (error) {
          console.error("Reward distribution failed, notifications will not be sent.", error);
        }
      } else {
        console.log("Could not find user details for top FIDs. No rewards sent.");
      }

    } else {
      // Non-reward day logic
      const usersToNotify = await prisma.user.findMany({
        where: {
          notificationToken: { not: null },
        },
        select: {
          fid: true,
          notificationToken: true,
        },
      });
      await sendNotifications(usersToNotify, notificationConfig, API_URL, API_SECRET_KEY);
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("A critical error occurred:", message);
  } finally {
    await prisma.$disconnect();
    console.log("Database connection closed.");
  }
}

main();