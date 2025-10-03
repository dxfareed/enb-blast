
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";
import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

if (!NEYNAR_API_KEY) {
  console.error("NEYNAR_API_KEY is not set in the environment variables.");
}

const config = new Configuration({
  apiKey: NEYNAR_API_KEY || '',
});

const neynarClient = new NeynarAPIClient(config);

export async function POST(req: NextRequest) {
  if (!NEYNAR_API_KEY) {
    return NextResponse.json({ message: "Neynar API key is not configured." }, { status: 500 });
  }

  try {
    const body = await req.json();

    if (body.type === 'mini_app.added') {
      const { fid, username } = body.data.user;

      if (!fid) {
        return NextResponse.json({ message: "FID not found in webhook payload." }, { status: 400 });
      }

      await neynarClient.publishFrameNotifications({
        targetFids: [fid],
        notification: {
          title: "Welcome to ENB Blast!",
          body: `heyy @${username}! Tap here to start playing.`,
          target_url: process.env.NEXT_PUBLIC_URL || "https://example.com",
        },
      });

      console.log(`Sent welcome notification to user FID: ${fid}`);
    }

    return NextResponse.json({ message: "Webhook received and processed." }, { status: 200 });
  } catch (error) {
    console.error("Error processing Neynar webhook:", error);
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}
