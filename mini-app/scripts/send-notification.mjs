/* import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";
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
    console.log("Fetching users with notification tokens...");
    const users = await prisma.user.findMany({
      where: {
        notificationToken: {
          not: null,
        },
      },
      select: {
        notificationToken: true,
      },
    });

    const tokens = users
      .map(user => user.notificationToken)
      .filter((token): token is string => token !== null);

    if (tokens.length === 0) {
      console.log("No users with notification tokens to notify.");
      return;
    }

    console.log(`Sending notification to ${tokens.length} users...`);

    const result = await client.publishFrameNotifications({
      notification_tokens: tokens,
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
 */