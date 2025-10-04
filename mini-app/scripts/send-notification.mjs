import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";
import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const prisma = new PrismaClient();
const NEYNAR_API_KEY =process.env.NEYNAR_API_KEY || "";

if (!NEYNAR_API_KEY) {
  console.error("NEYNAR_API_KEY is not set in the environment variables.");
  process.exit(1);
}

const config = new Configuration({
  apiKey: NEYNAR_API_KEY,
});

const client = new NeynarAPIClient(config);

const notificationMessage = {
    title: "ENB Blast Update!",
    body: "New power-ups have been added to the game. Check them out now!"
};

async function sendNotification() {
  try {
    console.log("Fetching users to notify...");
    const users = await prisma.user.findMany({
      where: {
        fid: {
          gt: 0,
        },
      },
      select: {
        fid: true,
      },
    });

    const fids = users
      .map(user => user.fid ? Number(user.fid) : null)
      .filter(fid => fid !== null);

    if (fids.length === 0) {
      console.log("No users to notify.");
      return;
    }
/* 
    console.log(`Sending notification to ${fids.length} users...`);
    console.log(`Title: ${notificationMessage.title}`);
    console.log(`Body: ${notificationMessage.body}`); */

    const result = await client.publishFrameNotifications({
      targetFids: [849768],
      notification: {
        ...notificationMessage,
        target_url: process.env.NEXT_PUBLIC_URL || "https://example.com",
      },
    });

    console.log("Notification sent successfully!");
    console.log(result);
  } catch (error) {
    console.error("Error sending notification:", error);
  } finally {
    await prisma.$disconnect();
  }
}

sendNotification();
