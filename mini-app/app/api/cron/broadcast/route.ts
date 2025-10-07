import { NextResponse } from 'next/server';
import 'dotenv/config';
import prisma from '@/lib/prisma';

export const maxDuration = 300;

interface NotificationDetails {
  [key: string]: any;
}

// --- NEW: Configuration for the dynamic logic ---
const REWARD_DAY_UTC = 4; // Thursday (0=Sun, 1=Mon, ..., 4=Thu)
const REWARD_HOUR_UTC = 16; // 4 PM UTC

const API_URL = process.env.NEXT_PUBLIC_URL
  ? `${process.env.NEXT_PUBLIC_URL}/api/notify`
  : 'http://localhost:3000/api/notify';

const API_SECRET_KEY = process.env.API_SECRET_KEY;

// --- NEW: Function to generate dynamic notification content ---
function getDynamicNotificationContent() {
  const now = new Date();
  
  const nextRewardDate = new Date(now);
  nextRewardDate.setUTCHours(REWARD_HOUR_UTC, 0, 0, 0);

  const currentDay = now.getUTCDay();
  let daysUntilReward = REWARD_DAY_UTC - currentDay;
  if (daysUntilReward < 0 || (daysUntilReward === 0 && now.getUTCHours() >= REWARD_HOUR_UTC)) {
    daysUntilReward += 7;
  }
  nextRewardDate.setUTCDate(now.getUTCDate() + daysUntilReward);

  const timeDiff = nextRewardDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.ceil(timeDiff / (1000 * 60 * 60));

  let title = "ENB Blast Weekly Rewards!";
  let body = "";

  const isTodayRewardDay = now.getUTCDay() === REWARD_DAY_UTC;

  if (isTodayRewardDay && now.getUTCHours() < REWARD_HOUR_UTC) {
    title = "🔥 Rewards Day!";
    body = `Leaderboard rewards are going out today at ${REWARD_HOUR_UTC}:00 UTC! Last chance to climb the ranks.`;
  } else if (isTodayRewardDay && now.getUTCHours() >= REWARD_HOUR_UTC) {
    title = "🏆 New Round Started!";
    body = "A new weekly leaderboard has begun! Play now to get a head start on the competition.";
  } else if (daysRemaining === 1) {
    title = "⏳ Almost Time!";
    body = `Only ${hoursRemaining} hours left until weekly rewards are distributed! Play now to secure your spot.`;
  } else {
    body = `Weekly rewards are coming in ${daysRemaining} days! Keep pushing for the top of the leaderboard.`;
  }

  return { title, body };
}


async function runBroadcast() {
  if (!API_SECRET_KEY) {
    throw new Error("API_SECRET_KEY is not defined in your .env file.");
  }

  console.log("Attempting to run broadcast...");

  // --- MODIFIED: Get the unique notification content for this run ---
  const dynamicNotificationContent = getDynamicNotificationContent();
  console.log(`Generated notification: "${dynamicNotificationContent.title} - ${dynamicNotificationContent.body}"`);

  const usersToNotify = await prisma.user.findMany({
    where: {
      notificationToken: { not: null },
    },
    select: {
      fid: true,
      notificationToken: true,
    },
  });

  if (usersToNotify.length === 0) {
    const message = "No users have subscribed for notifications.";
    console.log(message);
    return { message };
  }

  console.log(`Found ${usersToNotify.length} user(s) to notify.`);
  
  // --- Using parallel processing for performance, as discussed ---
  const notificationPromises = usersToNotify.map(async (user) => {
    // NOTE: Using your test FID. In production, change to: const fid = user.fid;
    const fid = Number("849768"); 
    
    try {
      const rawToken = user.notificationToken;
      if (!rawToken || rawToken.trim() === '') {
        console.log(`Skipping FID ${fid} due to empty token.`);
        return { status: 'rejected', fid };
      }

      const sanitizedToken = rawToken.trim().replace(/\0/g, '');
      const notificationDetails = JSON.parse(sanitizedToken) as NotificationDetails;

      // --- MODIFIED: Use the dynamic content in the payload ---
      const payload = {
        fid,
        notification: {
          ...dynamicNotificationContent, // This is the unique part
          notificationDetails,
        },
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_SECRET_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`Successfully sent notification to FID: ${fid}`);
        return { status: 'fulfilled', fid };
      } else {
        const errorResult = await response.json();
        console.error(`Failed to send to FID: ${fid}. Status: ${response.status}. Reason:`, errorResult.error || 'Unknown');
        return { status: 'rejected', fid };
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`Error processing FID: ${fid}. The token might be malformed.`, message);
      return { status: 'rejected', fid };
    }
  });

  const results = await Promise.allSettled(notificationPromises);
  const successCount = results.filter(r => r.status === 'fulfilled' && r.value.status === 'fulfilled').length;
  const errorCount = results.length - successCount;

  const summary = `Broadcast Complete - Success: ${successCount}, Failed: ${errorCount}`;
  console.log(summary);
  return { message: summary };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const maxRetries = 3;
  const initialDelay = 5000; 

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await runBroadcast();
      return NextResponse.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Broadcast attempt ${attempt} failed:`, message);
      if (attempt === maxRetries) {
        console.error("All broadcast attempts failed.");
        return NextResponse.json({ message: 'Critical error occurred after multiple retries' }, { status: 500 });
      }
      const delay = initialDelay * (2 ** (attempt - 1));
      console.log(`Waiting ${delay / 1000} seconds before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return NextResponse.json({ message: 'A critical unexpected error occurred' }, { status: 500 });
}