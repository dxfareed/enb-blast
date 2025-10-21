import { NextResponse } from 'next/server';
import 'dotenv/config';
import prisma from '@/lib/prisma';
import { REWARD_AMOUNTS, TOKEN_NAME } from '@/lib/rewardTiers';
import { formatPoints } from '@/app/utils/format';
import { withRetry } from '@/lib/retry';

export const maxDuration = 300;

interface NotificationDetails {
    [key: string]: any;
}

type UserToNotify = {
    fid: bigint;
    notificationToken: string | null;
};

async function sendNotifications(
    usersToNotify: UserToNotify[],
    notificationConfig: { title: string; body: string; },
    apiUrl: string,
    apiSecret: string
) {
    // This function remains the same as before
    if (usersToNotify.length === 0) {
        console.log("No users to notify.");
        return { success: 0, failed: 0 };
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
    return { success: successCount, failed: errorCount };
}

function getReminderNotificationContent() {
    const REWARD_DAY_UTC = 4; // Thursday
    const now = new Date();
    const currentDayUTC = now.getUTCDay();
    const daysRemaining = (REWARD_DAY_UTC - currentDayUTC + 7) % 7;

    let title: string;
    let body: string;

    if (daysRemaining === 1) {
        title = `Rewards go out in 23 hours!`;
        body = `Keep blasting for the top of the leaderboard.`;
    } else {
        title = `Rewards go out in ${daysRemaining} days!`;
        body = `Keep blasting for the top of the leaderboard.`;
    }

    return { title, body };
}

export async function GET(request: Request) {
    const secret = request.headers.get('x-vercel-cron-secret');
    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const API_URL = process.env.NEXT_PUBLIC_URL
        ? `${process.env.NEXT_PUBLIC_URL}/api/notify`
        : 'http://localhost:3000/api/notify';
    const API_SECRET_KEY = process.env.API_SECRET_KEY;

    if (!API_SECRET_KEY) {
        return NextResponse.json({ message: "API_SECRET_KEY is not defined" }, { status: 500 });
    }

    try {
        return await withRetry(async () => {
            const REWARD_DAY_UTC = 4; // Thursday
            const now = new Date();
            const currentDayUTC = now.getUTCDay();

            if (currentDayUTC === REWARD_DAY_UTC) {
                console.log("It's reward day! Fetching top 10 leaderboard users...");
                const leaderboardUrl = `${process.env.NEXT_PUBLIC_URL}/api/leaderboard`;
                const response = await fetch(leaderboardUrl);
                if (!response.ok) throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);

                const leaderboard = await response.json();
                if (!leaderboard.topUsers || leaderboard.topUsers.length === 0) {
                    return NextResponse.json({ message: "No users on leaderboard." });
                }

                const top10Users = leaderboard.topUsers.slice(0, 10);
                const top10Fids = top10Users.map((u: any) => BigInt(u.fid));

                const usersWithTokens = await prisma.user.findMany({
                    where: { fid: { in: top10Fids }, notificationToken: { not: null } },
                    select: { fid: true, notificationToken: true },
                });

                if (usersWithTokens.length === 0) {
                    return NextResponse.json({ message: "No top users have notification tokens." });
                }

                let successCount = 0;
                let failedCount = 0;

                for (const user of usersWithTokens) {
                    const rank = top10Users.findIndex((u: any) => BigInt(u.fid) === user.fid) + 1;
                    const rewardAmount = REWARD_AMOUNTS[rank] || 0;

                    const notificationConfig = {
                        title: `Congrats! You earned ${formatPoints(rewardAmount)} ${TOKEN_NAME}`,
                        body: `Your rank of #${rank} on the weekly leaderboard has earned you rewards. They will be sent shortly!`,
                    };

                    const result = await sendNotifications([user], notificationConfig, API_URL, API_SECRET_KEY);
                    successCount += result.success;
                    failedCount += result.failed;
                }

                return NextResponse.json({ message: `Reward notifications sent. Success: ${successCount}, Failed: ${failedCount}.` });

            } else {
                // Non-reward day logic
                const notificationConfig = getReminderNotificationContent();
                console.log(`Sending reminder: "${notificationConfig.title} - ${notificationConfig.body}"`);

                const usersToNotify = await prisma.user.findMany({
                    where: { notificationToken: { not: null } },
                    select: { fid: true, notificationToken: true },
                });

                const result = await sendNotifications(usersToNotify, notificationConfig, API_URL, API_SECRET_KEY);
                return NextResponse.json({ message: `Daily broadcast complete. Notifications sent: ${result.success}, Failed: ${result.failed}.` });
            }
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Broadcast cron job error after multiple retries:", message);
        return NextResponse.json({ message: "A critical error occurred." }, { status: 500 });
    }
}