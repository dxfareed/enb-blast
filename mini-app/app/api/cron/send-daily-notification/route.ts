import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

if (!NEYNAR_API_KEY) {
  throw new Error("NEYNAR_API_KEY is not set in the environment variables.");
}

const config = new Configuration({
  apiKey: NEYNAR_API_KEY,
});

const neynarClient = new NeynarAPIClient(config);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        fid: {
          //@ts-ignore
          not: null,
        },
      },
      select: {
        fid: true,
      },
    });

    const fids = users
      .map(user => user.fid ? Number(user.fid) : null)
      .filter((fid): fid is number => fid !== null);

    if (fids.length === 0) {
      return NextResponse.json({ message: "No users to notify." }, { status: 200 });
    }

    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const hours = now.getUTCHours();

    let notificationText = "";
    let title = "ENB Blast Weekly Rewards!";

    const nextThursday = new Date(now);
    nextThursday.setUTCDate(now.getUTCDate() + (4 - dayOfWeek + 7) % 7);
    nextThursday.setUTCHours(16, 0, 0, 0);
    if (dayOfWeek === 4 && hours >= 16) {
        nextThursday.setUTCDate(nextThursday.getUTCDate() + 7);
    }

    const timeDiff = nextThursday.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    if (dayOfWeek === 4 && hours >= 16) {
        title = "🏆 New Round Started!";
        notificationText = "A new weekly leaderboard has begun! Play now to get a head start on the competition.";
    } else if (dayOfWeek === 4 && hours < 16) {
        title = "🔥 Rewards Day!";
        notificationText = `Leaderboard rewards are going out today at 4 PM UTC! Last chance to climb the ranks.`;
    } else if (daysRemaining === 1) {
        const hoursRemaining = Math.floor(timeDiff / (1000 * 60 * 60));
        notificationText = `Only ${hoursRemaining} hours left until weekly rewards are distributed! Play now to secure your spot.`;
    } else {
        notificationText = `Weekly rewards are coming in ${daysRemaining} days! Keep pushing for the top of the leaderboard.`;
    }
    
    await neynarClient.publishFrameNotifications({
      targetFids: fids,
      notification: {
        title: title,
        body: notificationText,
        target_url: process.env.NEXT_PUBLIC_URL || "https://example.com",
      },
    });

    console.log(`Successfully sent daily notification to ${fids.length} users.`);
    return NextResponse.json({ message: `Notification sent to ${fids.length} users.` }, { status: 200 });

  } catch (error) {
    console.error("Error in daily notification cron job:", error);
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}
