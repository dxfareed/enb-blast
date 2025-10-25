import 'dotenv/config';
import prisma from '../lib/prisma';

interface NotificationDetails {
  [key: string]: any;
}

const NOTIFICATION_CONFIG = {
  title: "Blast x Inflynce 🚀🧡",
  body: "Inflynce collab is live now, 900k $ENB raffle!. Up for 72 hours",
};


const API_URL = process.env.NEXT_PUBLIC_URL
  ? `${process.env.NEXT_PUBLIC_URL}/api/notify`
  : 'http://localhost:3000/api/notify';

const API_SECRET_KEY = process.env.API_SECRET_KEY;

async function main() {
  if (!API_SECRET_KEY) {
    console.error("Error: API_SECRET_KEY is not defined in your .env file.");
    process.exit(1);
  }

  console.log("Starting production notification script...");

  try {
    const usersToNotify = await prisma.user.findMany({
      where: {
        //registrationStatus: 'ACTIVE',
        //id: 849768,
        notificationToken: { not: null },
      },
      select: {
        fid: true,
        notificationToken: true,
        username: true,
      },
    });

    if (usersToNotify.length === 0) {
      console.log("No users have subscribed for notifications. Exiting.");
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
            ...NOTIFICATION_CONFIG,
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

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("A critical error occurred:", message);
  } finally {
    await prisma.$disconnect();
    console.log("Database connection closed.");
  }
}

main();